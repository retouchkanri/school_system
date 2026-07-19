"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { COMPETENCY_CATEGORIES } from "@/lib/constants";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 社会人基礎力チェックの登録 (同じ生徒×学期は上書き更新) */
export async function saveCompetencyAssessment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const term = String(formData.get("term") ?? "").trim();
  const growth_comment = String(formData.get("growth_comment") ?? "").trim();
  const overall_comment = String(formData.get("overall_comment") ?? "").trim();

  if (!student_id) return { error: "生徒を選択してください" };
  if (!term) return { error: "評価対象の学期を入力してください" };

  const scores: Record<string, number> = {};
  for (const group of COMPETENCY_CATEGORIES) {
    for (const key of group.keys) {
      const raw = formData.get(`score_${key}`);
      if (raw == null || raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 1 && n <= 5) scores[key] = n;
    }
  }
  if (Object.keys(scores).length === 0) return { error: "少なくとも1つの項目を評価してください" };

  const { error } = await adminDb()
    .from("competency_assessments")
    .upsert(
      {
        student_id,
        term,
        scores,
        growth_comment: growth_comment || null,
        overall_comment: overall_comment || null,
        recorded_by: profile.id,
      },
      { onConflict: "student_id,term" }
    );

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/competency");
  revalidatePath(`/admin/students/${student_id}`);
  revalidatePath("/student/competency");
  revalidatePath("/parent/competency");
  return { ok: true };
}
