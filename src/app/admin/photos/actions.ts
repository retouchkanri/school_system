"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate } from "@/lib/format";
import type { SharedPhoto } from "@/lib/types";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_COUNT,
  MAX_PHOTO_SIZE,
  PHOTO_BUCKET,
  isPhotoAudience,
  type PhotoAudience,
} from "./photo-meta";
import { photoPaths } from "./shared";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** アップロードできた枚数 */
  uploaded?: number;
  /** 通知を送信できた宛先数 */
  notified?: number;
}

const NOTIFY_TITLE = "【東関東馬事学院】写真が届いています";

/** ファイル名は日本語・スペースを含みうるため、パスには使わず MIME から拡張子を決める */
function extFromFile(file: File): string {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

/** 保存先パス: {生徒ID または "all"}/{タイムスタンプ}-{連番}-{ランダム}.{拡張子} */
function photoPath(studentId: string | null, index: number, file: File): string {
  const folder = studentId ?? "all";
  const seq = String(index + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${Date.now()}-${seq}-${rand}.${extFromFile(file)}`;
}

interface Recipient {
  email: string | null;
  line_id: string | null;
}

/** 通知先プロフィール (メール/LINE) をIDリストから取得 */
async function recipientsForProfiles(ids: string[]): Promise<Recipient[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const { data } = await adminDb().from("profiles").select("email, line_id").in("id", unique);
  return ((data ?? []) as Recipient[]).filter((r) => r.email || r.line_id);
}

/** 通知の宛先を「生徒本人」「保護者」に分けて収集する */
async function collectRecipients(
  studentId: string | null,
  audience: PhotoAudience
): Promise<{ students: Recipient[]; parents: Recipient[] }> {
  const query = adminDb().from("students").select("user_id, parent_user_id");
  const { data } = studentId
    ? await query.eq("id", studentId)
    : await query.eq("status", "enrolled"); // 全体公開は在校生とその保護者のみ

  const rows = (data ?? []) as { user_id: string | null; parent_user_id: string | null }[];
  const wantStudent = audience === "student" || audience === "both";
  const wantParent = audience === "parent" || audience === "both";

  const students = wantStudent
    ? await recipientsForProfiles(rows.map((r) => r.user_id).filter((v): v is string => !!v))
    : [];
  const parents = wantParent
    ? await recipientsForProfiles(rows.map((r) => r.parent_user_id).filter((v): v is string => !!v))
    : [];
  return { students, parents };
}

function notifyBody(
  title: string,
  description: string,
  takenOn: string,
  count: number,
  portalUrl: string
): string {
  const lines = ["学校から写真が届きました。", "", `【タイトル】${title}`];
  if (takenOn) lines.push(`【撮影日】${fmtDate(takenOn)}`);
  lines.push(`【枚数】${count}枚`);
  if (description) lines.push("", description);
  lines.push("", "下記のページからご覧いただけます (ダウンロードも可能です)。", portalUrl);
  return lines.join("\n");
}

/** 写真をアップロードして公開し、必要に応じて本人・保護者へ通知する */
export async function sharePhotosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const takenOn = String(formData.get("taken_on") ?? "").trim();
  const studentIdRaw = String(formData.get("student_id") ?? "").trim();
  const audienceRaw = String(formData.get("audience") ?? "").trim();
  const notify = formData.get("notify") === "on";

  if (!title) return { error: "タイトルを入力してください" };
  if (!isPhotoAudience(audienceRaw)) return { error: "公開先を選択してください" };
  const audience: PhotoAudience = audienceRaw;

  // "" (全員に公開) は student_id = null
  let studentId: string | null = null;
  if (studentIdRaw && studentIdRaw !== "all") {
    const { data } = await adminDb().from("students").select("id").eq("id", studentIdRaw).maybeSingle();
    if (!data) return { error: "送り先の生徒が見つかりません" };
    studentId = (data as { id: string }).id;
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "画像を1枚以上選択してください" };
  if (files.length > MAX_PHOTO_COUNT) return { error: `一度にアップロードできるのは${MAX_PHOTO_COUNT}枚までです` };
  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return { error: `「${file.name}」はPNG・JPEG・WEBP・GIF形式ではありません` };
    }
    if (file.size > MAX_PHOTO_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return { error: `「${file.name}」は${mb}MBです。1枚あたり10MB以下にしてください` };
    }
  }

  // ストレージへアップロード (途中で失敗したらアップロード済みのファイルを削除して中断)
  const db = adminDb();
  const paths: string[] = [];
  for (const [index, file] of files.entries()) {
    const path = photoPath(studentId, index, file);
    const buffer = await file.arrayBuffer();
    const { error } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) {
      if (paths.length > 0) await db.storage.from(PHOTO_BUCKET).remove(paths);
      return { error: `「${file.name}」のアップロードに失敗しました` };
    }
    paths.push(path);
  }

  const { data: inserted, error: insertError } = await db
    .from("shared_photos")
    .insert({
      title,
      description: description || null,
      taken_on: takenOn || null,
      student_id: studentId,
      audience,
      files: paths,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    await db.storage.from(PHOTO_BUCKET).remove(paths);
    return { error: "写真の公開に失敗しました" };
  }

  // 通知 (DB書き込み成功後。通知の失敗が本処理を壊さないよう try/catch)
  let notified = 0;
  if (notify) {
    try {
      const origin = await siteOrigin();
      const { students, parents } = await collectRecipients(studentId, audience);
      if (students.length > 0) {
        notified += await notifyMany(
          students,
          NOTIFY_TITLE,
          notifyBody(title, description, takenOn, paths.length, `${origin}/student/photos`),
          "photo_shared"
        );
      }
      if (parents.length > 0) {
        notified += await notifyMany(
          parents,
          NOTIFY_TITLE,
          notifyBody(title, description, takenOn, paths.length, `${origin}/parent/photos`),
          "photo_shared"
        );
      }
      if (notified > 0) {
        await db
          .from("shared_photos")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", (inserted as { id: string }).id);
      }
    } catch (e) {
      console.error("[photos] 通知の送信に失敗しました:", e);
    }
  }

  revalidatePath("/admin/photos");
  revalidatePath("/student/photos");
  revalidatePath("/parent/photos");
  return { ok: true, uploaded: paths.length, notified };
}

/** 公開済みの写真を削除する (ストレージ上のファイルも削除) */
export async function deleteSharedPhotoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "不正な操作です" };

  const db = adminDb();
  const { data } = await db.from("shared_photos").select("*").eq("id", id).maybeSingle();
  const photo = (data as SharedPhoto | null) ?? null;
  if (!photo) return { error: "対象の写真が見つかりません" };

  const paths = photoPaths(photo);
  if (paths.length > 0) {
    const { error } = await db.storage.from(PHOTO_BUCKET).remove(paths);
    if (error) console.error("[photos] ストレージからの削除に失敗しました:", error.message);
  }

  const { error: deleteError } = await db.from("shared_photos").delete().eq("id", id);
  if (deleteError) return { error: "削除に失敗しました" };

  revalidatePath("/admin/photos");
  revalidatePath("/student/photos");
  revalidatePath("/parent/photos");
  return { ok: true };
}

/** 公開済みの写真について、改めて本人・保護者へ通知する */
export async function notifySharedPhotoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "不正な操作です" };

  const db = adminDb();
  const { data } = await db.from("shared_photos").select("*").eq("id", id).maybeSingle();
  const photo = (data as SharedPhoto | null) ?? null;
  if (!photo) return { error: "対象の写真が見つかりません" };

  const audience: PhotoAudience = isPhotoAudience(photo.audience) ? photo.audience : "both";
  const count = photoPaths(photo).length;

  let notified = 0;
  try {
    const origin = await siteOrigin();
    const { students, parents } = await collectRecipients(photo.student_id, audience);
    if (students.length > 0) {
      notified += await notifyMany(
        students,
        NOTIFY_TITLE,
        notifyBody(photo.title, photo.description ?? "", photo.taken_on ?? "", count, `${origin}/student/photos`),
        "photo_shared"
      );
    }
    if (parents.length > 0) {
      notified += await notifyMany(
        parents,
        NOTIFY_TITLE,
        notifyBody(photo.title, photo.description ?? "", photo.taken_on ?? "", count, `${origin}/parent/photos`),
        "photo_shared"
      );
    }
  } catch (e) {
    console.error("[photos] 通知の送信に失敗しました:", e);
    return { error: "通知の送信に失敗しました" };
  }

  if (notified > 0) {
    await db.from("shared_photos").update({ notified_at: new Date().toISOString() }).eq("id", id);
  }

  revalidatePath("/admin/photos");
  return { ok: true, notified };
}
