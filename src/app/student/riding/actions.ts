"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";

export interface RidingActionState {
  ok?: boolean;
  error?: string;
}

export async function submitRidingReport(_prev: RidingActionState, formData: FormData): Promise<RidingActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const horseId = String(formData.get("horse_id") ?? "");
  const reportDate = String(formData.get("report_date") ?? "");
  const lesson = String(formData.get("lesson") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const horseCondition = String(formData.get("horse_condition") ?? "").trim();

  if (!horseId || !reportDate || !content) return { error: "馬・日付・騎乗内容は必須です" };

  // 馬の実在確認
  const { data: horse } = await adminDb().from("horses").select("id").eq("id", horseId).maybeSingle();
  if (!horse) return { error: "選択された馬が見つかりません" };

  const { error } = await adminDb().from("riding_reports").insert({
    student_id: student.id,
    horse_id: horseId,
    report_date: reportDate,
    lesson: lesson || null,
    content,
    horse_condition: horseCondition || null,
    reported_by: profile.id,
  });
  if (error) return { error: "騎乗報告の送信に失敗しました" };

  revalidatePath("/student/riding");
  return { ok: true };
}
