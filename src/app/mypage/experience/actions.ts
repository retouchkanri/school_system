"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { computeEnrollmentProbability } from "@/lib/ai";
import { EXPERIENCE_QUESTIONS_STUDENT, EXPERIENCE_QUESTIONS_PARENT } from "@/lib/constants";
import type { ExperienceSurvey, RespondentType } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 体験終了アンケート (本人/保護者) の送信 → 入学確率の更新 */
export async function submitExperienceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const respondentRaw = String(formData.get("respondent") ?? "");
  if (respondentRaw !== "student" && respondentRaw !== "parent") return { error: "回答者区分が不正です" };
  const respondent: RespondentType = respondentRaw;

  // 体験参加済みであることを検証
  const { data: attended } = await adminDb()
    .from("open_campus_bookings")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "attended")
    .limit(1)
    .maybeSingle();
  if (!attended) return { error: "体験参加後にご回答いただけます" };

  const questions = respondent === "student" ? EXPERIENCE_QUESTIONS_STUDENT : EXPERIENCE_QUESTIONS_PARENT;
  const answers: Record<string, string> = {};
  for (const q of questions) {
    answers[q.id] = String(formData.get(q.id) ?? "").trim();
  }
  if (questions.some((q) => q.type === "choice" && !answers[q.id])) {
    return { error: "未回答の選択項目があります" };
  }

  const { error } = await adminDb()
    .from("experience_surveys")
    .upsert(
      { lead_id: lead.id, respondent, answers, submitted_at: new Date().toISOString() },
      { onConflict: "lead_id,respondent" }
    );
  if (error) return { error: "回答の保存に失敗しました" };

  // 両者の回答から入学確率を再計算
  const { data: surveysData } = await adminDb().from("experience_surveys").select("*").eq("lead_id", lead.id);
  const surveys = ((surveysData as ExperienceSurvey[] | null) ?? []).slice();
  const studentAnswers = surveys.find((s) => s.respondent === "student")?.answers ?? null;
  const parentAnswers = surveys.find((s) => s.respondent === "parent")?.answers ?? null;
  const probability = computeEnrollmentProbability(studentAnswers, parentAnswers);

  await adminDb()
    .from("leads")
    .update({ ai_enrollment_probability: probability, updated_at: new Date().toISOString() })
    .eq("id", lead.id);

  await advanceLeadStatus(lead.id, "exp_survey_answered");

  revalidatePath("/mypage/experience");
  revalidatePath("/mypage");
  return { ok: true };
}
