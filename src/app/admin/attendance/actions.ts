"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceRecord, AttendanceStatus, Profile, Student } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** 保護者への通知を実際に送信できたか (欠席・遅刻・早退へ変更したときのみ true になりうる) */
  parentNotified?: boolean;
  /** 通知対象の状態だが、保護者アカウント未連携 (または連絡先未登録) で送信できなかった */
  parentUnlinked?: boolean;
}

export interface BulkPresentState {
  ok?: boolean;
  error?: string;
  /** 今回「出席」として新規登録した人数 */
  count?: number;
}

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "early_leave"];

/** 保護者へ自動通知する状態 (出席では通知しない) */
const ALERT_STATUSES: AttendanceStatus[] = ["absent", "late", "early_leave"];

function isDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function revalidateAttendance() {
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/monthly");
}

export async function saveAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "") as AttendanceStatus;
  const note = String(formData.get("note") ?? "").trim();

  if (!student_id || !isDate(date)) return { error: "入力が不正です" };
  if (!VALID_STATUSES.includes(status)) return { error: "出欠状態の値が不正です" };

  const db = adminDb();

  // 重複通知の抑制: 既存レコードの状態を先に取得し、状態が変化したときだけ保護者へ通知する
  const { data: existingData } = await db
    .from("attendance_records")
    .select("status")
    .eq("student_id", student_id)
    .eq("date", date)
    .maybeSingle();
  const previousStatus = (existingData as Pick<AttendanceRecord, "status"> | null)?.status ?? null;

  const { error } = await db
    .from("attendance_records")
    .upsert(
      {
        student_id,
        date,
        status,
        note: note || null,
        recorded_by: profile.id,
      },
      { onConflict: "student_id,date" }
    );

  if (error) return { error: "保存に失敗しました" };

  revalidateAttendance();

  // 欠席・遅刻・早退に「変化した」ときのみ保護者へ通知 (備考のみの修正では送らない)
  const shouldNotify = ALERT_STATUSES.includes(status) && previousStatus !== status;
  if (!shouldNotify) return { ok: true };

  // 通知の失敗が保存を失敗させないよう、DB書き込み成功後に try/catch で実行する
  try {
    const { data: studentData } = await db
      .from("students")
      .select("id, name, parent_user_id")
      .eq("id", student_id)
      .maybeSingle();
    const student = (studentData as Pick<Student, "id" | "name" | "parent_user_id"> | null) ?? null;
    if (!student?.parent_user_id) return { ok: true, parentNotified: false, parentUnlinked: true };

    const { data: parentData } = await db
      .from("profiles")
      .select("*")
      .eq("id", student.parent_user_id)
      .maybeSingle();
    const parent = (parentData as Profile | null) ?? null;
    if (!parent) return { ok: true, parentNotified: false, parentUnlinked: true };

    const label = ATTENDANCE_STATUS_LABELS[status];
    const portalUrl = `${await siteOrigin()}/parent/attendance`;
    const sent = await notifyBoth(
      parent.email,
      parent.line_id,
      `【東関東馬事学院】${student.name}さんの出欠記録 (${label})`,
      [
        `${student.name} さんの出欠を以下のとおり記録しました。`,
        "",
        `日付: ${date.replace(/-/g, "/")}`,
        `状態: ${label}`,
        `備考: ${note || "—"}`,
        "",
        "詳細は保護者ポータルでご確認ください。",
        "",
        "▼保護者ポータル (出欠)",
        portalUrl,
      ].join("\n"),
      "attendance_alert"
    );
    return { ok: true, parentNotified: sent > 0, parentUnlinked: sent === 0 };
  } catch (e) {
    console.error("[attendance] 保護者通知に失敗しました:", e);
    return { ok: true, parentNotified: false };
  }
}

/**
 * 指定日にまだ出欠レコードが無い在籍生徒だけを「出席」で一括登録する。
 * 既に登録済みの生徒は対象外 (上書きしない)。一括登録では保護者通知は行わない。
 */
export async function markAllPresent(_prev: BulkPresentState, formData: FormData): Promise<BulkPresentState> {
  const profile = await requireRole("admin");

  const date = String(formData.get("date") ?? "");
  if (!isDate(date)) return { error: "日付が不正です" };

  const db = adminDb();
  const [{ data: studentsData, error: studentsError }, { data: recordsData, error: recordsError }] = await Promise.all([
    db.from("students").select("id").eq("status", "enrolled"),
    db.from("attendance_records").select("student_id").eq("date", date),
  ]);
  if (studentsError || recordsError) return { error: "生徒情報の取得に失敗しました" };

  const recorded = new Set(((recordsData ?? []) as { student_id: string }[]).map((r) => r.student_id));
  const targets = ((studentsData ?? []) as { id: string }[]).filter((s) => !recorded.has(s.id));

  if (targets.length === 0) return { ok: true, count: 0 };

  const { error } = await db.from("attendance_records").upsert(
    targets.map((s) => ({
      student_id: s.id,
      date,
      status: "present" as AttendanceStatus,
      note: null,
      recorded_by: profile.id,
    })),
    { onConflict: "student_id,date" }
  );
  if (error) return { error: "一括登録に失敗しました" };

  revalidateAttendance();
  return { ok: true, count: targets.length };
}
