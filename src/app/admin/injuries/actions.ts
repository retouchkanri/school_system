"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate, fmtYen } from "@/lib/format";
import {
  INJURY_OCCURRED_OPTIONS,
  INJURY_SEVERITY_OPTIONS,
  INSURANCE_CLAIM_STATUS_LABELS,
} from "@/lib/constants";
import type { InsuranceClaim, InsuranceClaimStatus, Profile, Student } from "@/lib/types";
import { ADMIN_SETTABLE_STATUSES } from "./options";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

interface InjuryInput {
  student_id: string;
  date: string;
  occurred_at: string | null;
  horse_id: string | null;
  body_part: string | null;
  description: string;
  severity: string | null;
  treatment: string | null;
  hospital: string | null;
  doctor_note: string | null;
}

/** 登録・更新で共通のバリデーション。エラー時は { error } を返す */
function parseInjuryForm(formData: FormData): { error: string } | { data: InjuryInput } {
  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const occurred_at = String(formData.get("occurred_at") ?? "").trim();
  const horse_id = String(formData.get("horse_id") ?? "").trim();
  const body_part = String(formData.get("body_part") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const treatment = String(formData.get("treatment") ?? "").trim();
  const hospital = String(formData.get("hospital") ?? "").trim();
  const doctor_note = String(formData.get("doctor_note") ?? "").trim();

  if (!student_id) return { error: "生徒を選択してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "発生日を入力してください" };
  if (!description) return { error: "症状の説明を入力してください" };
  if (occurred_at && !INJURY_OCCURRED_OPTIONS.includes(occurred_at)) return { error: "発生場面の値が不正です" };
  if (severity && !INJURY_SEVERITY_OPTIONS.includes(severity)) return { error: "程度の値が不正です" };

  return {
    data: {
      student_id,
      date,
      occurred_at: occurred_at || null,
      horse_id: horse_id || null,
      body_part: body_part || null,
      description,
      severity: severity || null,
      treatment: treatment || null,
      hospital: hospital || null,
      doctor_note: doctor_note || null,
    },
  };
}

function revalidateInjuryPaths(studentId: string, otherStudentId?: string) {
  revalidatePath("/admin/injuries");
  revalidatePath("/student/insurance");
  revalidatePath("/parent/insurance");
  revalidatePath(`/admin/students/${studentId}`);
  if (otherStudentId && otherStudentId !== studentId) revalidatePath(`/admin/students/${otherStudentId}`);
}

type StudentContact = Pick<Student, "id" | "name" | "student_number" | "user_id" | "parent_user_id">;

async function loadStudentContact(studentId: string): Promise<StudentContact | null> {
  const { data } = await adminDb()
    .from("students")
    .select("id, name, student_number, user_id, parent_user_id")
    .eq("id", studentId)
    .maybeSingle();
  return (data as StudentContact | null) ?? null;
}

/**
 * 怪我記録の登録を本人・保護者へ通知する。
 * 呼び出し側で「通院・入院」のときだけ呼ぶこと (通知過多を避けるため)。
 */
async function notifyInjuryRecorded(input: InjuryInput) {
  const db = adminDb();
  const student = await loadStudentContact(input.student_id);
  if (!student) return;

  let horseName: string | null = null;
  if (input.horse_id) {
    const { data } = await db.from("horses").select("name").eq("id", input.horse_id).maybeSingle();
    horseName = (data as { name: string } | null)?.name ?? null;
  }

  const ids = [student.user_id, student.parent_user_id].filter(Boolean) as string[];
  if (ids.length === 0) return;
  const { data: profilesData } = await db.from("profiles").select("*").in("id", ids);
  const profiles = (profilesData ?? []) as Profile[];
  if (profiles.length === 0) return;

  const origin = await siteOrigin();
  const title = `【東関東馬事学院】${student.name}さんの負傷について`;

  for (const p of profiles) {
    const portal = p.role === "parent" ? `${origin}/parent/insurance` : `${origin}/student/insurance`;
    const body = [
      `${student.name} さんの負傷について、学校で以下のとおり記録いたしました。`,
      "",
      `発生日: ${fmtDate(input.date)}`,
      `発生場面: ${input.occurred_at ?? "—"}`,
      ...(horseName ? [`関連する馬: ${horseName}`] : []),
      `負傷部位: ${input.body_part ?? "—"}`,
      `程度: ${input.severity ?? "—"}`,
      `症状: ${input.description}`,
      `処置: ${input.treatment ?? "—"}`,
      `受診先: ${input.hospital ?? "—"}`,
      "",
      "治療費などについて保険の申請が必要な場合は、ポータルの「怪我・保険」からお手続きいただけます。",
      "ご不明な点がございましたら学校までお気軽にお問い合わせください。",
      "",
      "▼ポータル (怪我・保険)",
      portal,
    ].join("\n");
    await notifyBoth(p.email, p.line_id, title, body, "injury_recorded");
  }
}

export async function createInjury(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const parsed = parseInjuryForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await adminDb()
    .from("injury_records")
    .insert({ ...parsed.data, recorded_by: profile.id });
  if (error) return { error: "登録に失敗しました" };

  // 通知は「通院」「入院」の場合のみ。擦り傷程度の軽傷まで毎回メール+LINEを送ると
  // 通知過多になり、本当に急を要する連絡が埋もれてしまうため、程度で送信対象を絞っている。
  if (parsed.data.severity === "通院" || parsed.data.severity === "入院") {
    try {
      await notifyInjuryRecorded(parsed.data);
    } catch (e) {
      console.error("[injuries] 負傷通知の送信に失敗しました:", e);
    }
  }

  revalidateInjuryPaths(parsed.data.student_id);
  return { ok: true };
}

export async function updateInjury(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "更新対象が指定されていません" };

  const parsed = parseInjuryForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = adminDb();
  const { data: existing } = await db.from("injury_records").select("id, student_id").eq("id", id).maybeSingle();
  if (!existing) return { error: "怪我記録が見つかりません" };

  const { error } = await db.from("injury_records").update(parsed.data).eq("id", id);
  if (error) return { error: "更新に失敗しました" };

  // 更新時は通知しない (登録時に送った内容の訂正で何度も通知が飛ぶのを防ぐため)
  revalidateInjuryPaths(parsed.data.student_id, (existing as { student_id: string }).student_id);
  return { ok: true };
}

export async function deleteInjury(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "削除対象が指定されていません" };

  const db = adminDb();
  const { data: existing } = await db.from("injury_records").select("id, student_id").eq("id", id).maybeSingle();
  if (!existing) return { error: "怪我記録が見つかりません" };

  const { error } = await db.from("injury_records").delete().eq("id", id);
  if (error) return { error: "削除に失敗しました" };

  revalidateInjuryPaths((existing as { student_id: string }).student_id);
  return { ok: true };
}

/* ============ 保険申請の処理 ============ */

type ClaimWithRelations = InsuranceClaim & {
  student: Pick<Student, "id" | "name" | "student_number" | "user_id" | "parent_user_id"> | null;
  injury: { id: string; date: string; occurred_at: string | null } | null;
};

/** 状態ごとの通知文面 (承認・支払済はとくに丁寧な文面にする) */
function claimNotifyText(
  status: InsuranceClaimStatus,
  studentName: string,
  claim: ClaimWithRelations,
  comment: string,
  portalUrl: string
): { title: string; body: string } {
  const detail = [
    `生徒: ${studentName}`,
    `対象の怪我: ${claim.injury ? `${fmtDate(claim.injury.date)}${claim.injury.occurred_at ? ` (${claim.injury.occurred_at})` : ""}` : "指定なし"}`,
    `保険会社: ${claim.insurance_company ?? "—"}`,
    `請求予定額: ${claim.claim_amount == null ? "—" : fmtYen(claim.claim_amount)}`,
  ].join("\n");
  const commentBlock = comment ? `\n\n【職員コメント】\n${comment}` : "";
  const footer = `\n\n▼申請状況の確認\n${portalUrl}`;

  switch (status) {
    case "reviewing":
      return {
        title: "【東関東馬事学院】保険申請の確認を開始しました",
        body:
          `保険申請をお受けし、内容の確認を開始いたしました。\n\n${detail}` +
          `\n\n確認が完了しましたら、あらためて結果をご連絡いたします。今しばらくお待ちください。` +
          commentBlock +
          footer,
      };
    case "approved":
      return {
        title: "【東関東馬事学院】保険申請が承認されました",
        body:
          `このたびはご申請いただきありがとうございました。\n内容を確認のうえ、保険申請を承認いたしました。\n\n${detail}` +
          `\n\n今後、保険会社への手続きおよびお支払いの準備を進めてまいります。` +
          `\n手続きの進捗については、あらためてご連絡いたします。` +
          commentBlock +
          footer,
      };
    case "rejected":
      return {
        title: "【東関東馬事学院】保険申請の審査結果について",
        body:
          `ご申請いただいた保険申請について、内容を確認いたしました。\n\n${detail}` +
          `\n\n誠に恐れ入りますが、今回は承認いたしかねる結果となりました。` +
          `\n理由や今後のお手続きについては下記のコメントをご確認ください。ご不明な点は学校までお気軽にお問い合わせください。` +
          commentBlock +
          footer,
      };
    case "paid":
      return {
        title: "【東関東馬事学院】保険金のお支払いが完了しました",
        body:
          `お待たせいたしました。保険金のお支払い手続きが完了いたしましたのでご連絡いたします。\n\n${detail}` +
          `\n\nこのたびは手続きにご協力いただき、誠にありがとうございました。` +
          `\n引き続き安全な学校生活を送っていただけるよう努めてまいります。` +
          commentBlock +
          footer,
      };
    default:
      return {
        title: `【東関東馬事学院】保険申請の状態が「${INSURANCE_CLAIM_STATUS_LABELS[status]}」になりました`,
        body: `保険申請の状態を更新しました。\n\n${detail}${commentBlock}${footer}`,
      };
  }
}

export async function updateClaimStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as InsuranceClaimStatus;
  const currentStatus = String(formData.get("current_status") ?? "") as InsuranceClaimStatus;
  const comment = String(formData.get("staff_comment") ?? "").trim();

  if (!id) return { error: "不正な操作です" };
  if (!ADMIN_SETTABLE_STATUSES.includes(status)) return { error: "状態の値が不正です" };

  const db = adminDb();
  const { data } = await db
    .from("insurance_claims")
    .select(
      "*, student:students(id, name, student_number, user_id, parent_user_id), injury:injury_records(id, date, occurred_at)"
    )
    .eq("id", id)
    .maybeSingle();
  const claim = (data as ClaimWithRelations | null) ?? null;
  if (!claim) return { error: "対象の申請が見つかりません" };
  if (claim.status === status) {
    return { error: `この申請はすでに「${INSURANCE_CLAIM_STATUS_LABELS[status]}」です` };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    // コメント未入力なら以前のコメントを消さずに残す
    staff_comment: comment || claim.staff_comment,
    handled_by: profile.id,
    handled_at: now,
  };
  if (status === "paid") patch.paid_at = now;

  // 画面表示時の状態を条件に付け、連打・別の職員との同時操作による上書きを防ぐ
  const expected = currentStatus || claim.status;
  const { data: updated, error } = await db
    .from("insurance_claims")
    .update(patch)
    .eq("id", id)
    .eq("status", expected)
    .select("id");
  if (error) return { error: "更新に失敗しました" };
  if (!updated || updated.length === 0) return { error: "この申請の状態は別の操作で更新されています。画面を再読み込みしてください" };

  // 申請者へ結果を通知 (DB更新成功後。通知失敗が本処理を壊さないよう try/catch)
  try {
    const recipientIds = claim.submitted_by
      ? [claim.submitted_by]
      : ([claim.student?.user_id, claim.student?.parent_user_id].filter(Boolean) as string[]);
    if (recipientIds.length > 0) {
      const { data: profilesData } = await db.from("profiles").select("*").in("id", recipientIds);
      const recipients = (profilesData ?? []) as Profile[];
      const origin = await siteOrigin();
      const studentName = claim.student?.name ?? "";
      for (const r of recipients) {
        const portal = r.role === "parent" ? `${origin}/parent/insurance` : `${origin}/student/insurance`;
        const { title, body } = claimNotifyText(
          status,
          studentName,
          claim,
          comment || claim.staff_comment || "",
          portal
        );
        await notifyBoth(r.email, r.line_id, title, body, "insurance_claim_update");
      }
    }
  } catch (e) {
    console.error("[injuries] 保険申請の状態更新通知に失敗しました:", e);
  }

  revalidatePath("/admin/injuries");
  revalidatePath("/student/insurance");
  revalidatePath("/parent/insurance");
  return { ok: true };
}
