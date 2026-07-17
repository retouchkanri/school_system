"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { computeEnrollmentProbability } from "@/lib/ai";
import { POST_VISIT_QUESTIONS } from "@/lib/constants";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 学校見学後アンケートの送信 → 入学確率の更新 */
export async function submitExperienceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  // 体験参加済みであることを検証
  const { data: attended } = await adminDb()
    .from("open_campus_bookings")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "attended")
    .limit(1)
    .maybeSingle();
  if (!attended) return { error: "体験参加後にご回答いただけます" };

  const answers: Record<string, string> = {};
  for (const q of POST_VISIT_QUESTIONS) {
    if (q.type === "checkbox") {
      answers[q.id] = formData.getAll(q.id).map(String).join("、");
    } else {
      answers[q.id] = String(formData.get(q.id) ?? "").trim();
    }
  }
  const missing = POST_VISIT_QUESTIONS.filter((q) => q.required && !answers[q.id]);
  if (missing.length > 0) return { error: "未回答の必須項目があります" };

  const { error } = await adminDb()
    .from("experience_surveys")
    .upsert(
      { lead_id: lead.id, respondent: "student", answers, submitted_at: new Date().toISOString() },
      { onConflict: "lead_id,respondent" }
    );
  if (error) return { error: "回答の保存に失敗しました" };

  const probability = computeEnrollmentProbability(answers);
  await adminDb()
    .from("leads")
    .update({ ai_enrollment_probability: probability, updated_at: new Date().toISOString() })
    .eq("id", lead.id);

  await advanceLeadStatus(lead.id, "exp_survey_answered");

  revalidatePath("/mypage/experience");
  revalidatePath("/mypage");
  return { ok: true };
}
