"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

export async function createRidingReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const horse_id = String(formData.get("horse_id") ?? "");
  const report_date = String(formData.get("report_date") ?? "");
  const lesson = String(formData.get("lesson") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const horse_condition = String(formData.get("horse_condition") ?? "").trim();

  if (!student_id || !horse_id) return { error: "生徒と馬を選択してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report_date)) return { error: "日付を入力してください" };
  if (!content) return { error: "騎乗内容を入力してください" };

  const { error } = await adminDb().from("riding_reports").insert({
    student_id,
    horse_id,
    report_date,
    lesson: lesson || null,
    content,
    horse_condition: horse_condition || null,
    reported_by: profile.id,
  });

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/riding-reports");
  return { ok: true };
}
