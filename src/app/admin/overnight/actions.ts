"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { fmtDate } from "@/lib/format";
import type { OvernightLeaveRequest, Student, Profile } from "@/lib/types";

/** 職員確認済にする */
export async function acknowledgeRequest(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await adminDb().from("overnight_leave_requests").update({ staff_acknowledged: true }).eq("id", id);
  revalidatePath("/admin/overnight");
}

/** 承認待ちの外泊届について保護者へ督促を送る */
export async function remindParent(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = adminDb();
  const { data: requestData } = await db
    .from("overnight_leave_requests")
    .select("*, student:students(id, name, parent_user_id)")
    .eq("id", id)
    .maybeSingle();
  const request = requestData as (OvernightLeaveRequest & { student: Pick<Student, "id" | "name" | "parent_user_id"> | null }) | null;
  if (!request || request.parent_approval !== "pending") return;
  if (!request.student?.parent_user_id) return;

  const { data: parentData } = await db
    .from("profiles")
    .select("*")
    .eq("id", request.student.parent_user_id)
    .maybeSingle();
  const parent = parentData as Profile | null;
  if (!parent) return;

  await notifyBoth(
    parent.email,
    parent.line_id,
    "【東関東馬事学院】外泊届の承認のお願い",
    `${request.student.name}さんから外泊届が提出されています。\n期間: ${fmtDate(request.start_date)} 〜 ${fmtDate(request.end_date)}\n行き先: ${request.destination}\n保護者ポータルにログインのうえ、承認または却下の手続きをお願いいたします。`,
    "overnight_reminder"
  );

  revalidatePath("/admin/overnight");
  revalidatePath("/admin/notifications");
}
