"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import type { AttendanceStatus } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "early_leave"];

export async function saveAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "") as AttendanceStatus;
  const note = String(formData.get("note") ?? "").trim();

  if (!student_id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "入力が不正です" };
  if (!VALID_STATUSES.includes(status)) return { error: "出欠状態の値が不正です" };

  const { error } = await adminDb()
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

  revalidatePath("/admin/attendance");
  return { ok: true };
}
