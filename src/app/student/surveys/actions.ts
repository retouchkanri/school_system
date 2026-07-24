"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import type { StudentSurvey } from "@/lib/types";

export interface SurveyActionState {
  ok?: boolean;
  error?: string;
}

export async function submitSurveyAnswer(_prev: SurveyActionState, formData: FormData): Promise<SurveyActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const surveyId = String(formData.get("survey_id") ?? "");
  if (!surveyId) return { error: "アンケートが指定されていません" };

  const { data } = await adminDb()
    .from("student_surveys")
    .select("*")
    .eq("id", surveyId)
    .eq("active", true)
    .eq("target", "students")
    .maybeSingle();
  const survey = (data as StudentSurvey | null) ?? null;
  if (!survey) return { error: "回答対象のアンケートが見つかりません" };

  const answers: Record<string, string> = {};
  for (const q of survey.questions ?? []) {
    const value = String(formData.get(`q_${q.id}`) ?? "").trim();
    if (value) answers[q.id] = value;
  }
  if (Object.keys(answers).length === 0) return { error: "回答を入力してください" };

  // 選択式の設問はサーバー側でも必須として検証する (一度提出すると追記できないため)
  const missingChoice = (survey.questions ?? []).find((q) => q.type === "choice" && !answers[q.id]);
  if (missingChoice) return { error: `「${missingChoice.text}」に回答してください` };

  const { error } = await adminDb()
    .from("student_survey_responses")
    .upsert(
      {
        survey_id: surveyId,
        student_id: student.id,
        answers,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "survey_id,student_id" }
    );
  if (error) return { error: "回答の送信に失敗しました" };

  revalidatePath("/student/surveys");
  return { ok: true };
}
