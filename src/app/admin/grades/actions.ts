"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

export async function createGradeRecord(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const term = String(formData.get("term") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const evaluation = String(formData.get("evaluation") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!student_id) return { error: "生徒を選択してください" };
  if (!term) return { error: "学期を入力してください" };
  if (!subject) return { error: "科目を入力してください" };

  let score: number | null = null;
  if (scoreRaw) {
    const n = Number(scoreRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { error: "点数は0〜100で入力してください" };
    score = Math.round(n);
  }

  const { error } = await adminDb().from("grade_records").insert({
    student_id,
    term,
    subject,
    score,
    evaluation: evaluation || null,
    comment: comment || null,
    recorded_by: profile.id,
  });

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/grades");
  revalidatePath(`/admin/students/${student_id}`);
  revalidatePath("/student/grades");
  revalidatePath("/parent/grades");
  return { ok: true };
}
