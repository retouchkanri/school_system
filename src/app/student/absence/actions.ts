"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceStatus } from "@/lib/types";

export interface AbsenceActionState {
  ok?: boolean;
  error?: string;
}

/** 事前連絡で選べる区分 (出席は対象外) */
const VALID_KINDS: AttendanceStatus[] = ["absent", "late", "early_leave"];

export async function submitAbsenceRequest(
  _prev: AbsenceActionState,
  formData: FormData
): Promise<AbsenceActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const date = String(formData.get("date") ?? "");
  const kind = String(formData.get("kind") ?? "") as AttendanceStatus;
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "日付を正しく入力してください" };
  if (!VALID_KINDS.includes(kind)) return { error: "区分の値が不正です" };
  if (!reason) return { error: "理由は必須です" };

  const { error } = await adminDb().from("absence_requests").insert({
    student_id: student.id,
    date,
    kind,
    reason,
    detail: detail || null,
    submitted_by: profile.id,
    submitted_role: "student",
    status: "pending",
  });
  if (error) return { error: "連絡の送信に失敗しました" };

  // 職員へ通知 (CONTACT_RECIPIENTS 優先、未設定なら管理者アカウントのメールへ)
  const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
  const adminEmails = ((adminsData ?? []) as { email: string | null }[])
    .map((a) => a.email)
    .filter(Boolean) as string[];
  const adminUrl = `${await siteOrigin()}/admin/absences`;
  await notifyStaff(
    `欠席・遅刻の連絡がありました(${student.name})`,
    `生徒: ${student.name}(${student.student_number})\n提出者: 生徒本人\n日付: ${date}\n区分: ${ATTENDANCE_STATUS_LABELS[kind]}\n理由: ${reason}${detail ? `\n補足: ${detail}` : ""}\n\n▼管理画面\n${adminUrl}`,
    "absence_request",
    adminEmails
  );

  revalidatePath("/student/absence");
  revalidatePath("/admin/absences");
  return { ok: true };
}
