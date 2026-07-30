"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceStatus } from "@/lib/types";

export interface ParentAbsenceActionState {
  ok?: boolean;
  error?: string;
}

/** 事前連絡で選べる区分 (出席は対象外) */
const VALID_KINDS: AttendanceStatus[] = ["absent", "late", "early_leave"];

export async function submitParentAbsenceRequest(
  _prev: ParentAbsenceActionState,
  formData: FormData
): Promise<ParentAbsenceActionState> {
  const profile = await requireRole("parent");

  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const kind = String(formData.get("kind") ?? "") as AttendanceStatus;
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!studentId) return { error: "生徒を選択してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "日付を正しく入力してください" };
  if (!VALID_KINDS.includes(kind)) return { error: "区分の値が不正です" };
  if (!reason) return { error: "理由は必須です" };

  // 所有権検証: 対象生徒が自分の子であること
  const children = await getStudentsForParent(profile.id);
  const child = children.find((c) => c.id === studentId);
  if (!child) return { error: "この生徒の連絡を提出する権限がありません" };

  const { error } = await adminDb().from("absence_requests").insert({
    student_id: child.id,
    date,
    kind,
    reason,
    detail: detail || null,
    submitted_by: profile.id,
    submitted_role: "parent",
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
    `欠席・遅刻の連絡がありました(${child.name})`,
    `生徒: ${child.name}(${child.student_number})\n提出者: 保護者(${profile.full_name})\n日付: ${date}\n区分: ${ATTENDANCE_STATUS_LABELS[kind]}\n理由: ${reason}${detail ? `\n補足: ${detail}` : ""}\n\n▼管理画面\n${adminUrl}`,
    "absence_request",
    adminEmails
  );

  revalidatePath("/parent/absence");
  revalidatePath("/student/absence");
  revalidatePath("/admin/absences");
  return { ok: true };
}
