"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { analyzePreScreening } from "@/lib/ai";
import { PRE_SCREENING_QUESTIONS } from "@/lib/constants";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 入学仮審査アンケートの送信 → AI判定 → ステータス前進 */
export async function submitSurveyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  // 既回答チェック (leads.id は unique 制約)
  const { data: existing } = await adminDb()
    .from("pre_screening_surveys")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();
  if (existing) return { error: "すでに回答済みです" };

  const answers: Record<string, string> = {};
  for (const q of PRE_SCREENING_QUESTIONS) {
    answers[q.id] = String(formData.get(q.id) ?? "").trim();
  }
  const missing = PRE_SCREENING_QUESTIONS.filter((q) => q.type === "choice" && !answers[q.id]);
  if (missing.length > 0) return { error: "未回答の選択項目があります" };
  if (!answers["q1"] || !answers["q2"]) return { error: "志望理由と将来の夢をご記入ください" };

  const { error } = await adminDb().from("pre_screening_surveys").insert({
    lead_id: lead.id,
    answers,
  });
  if (error) return { error: "回答の保存に失敗しました" };

  // AI判定を実行し、リードに反映
  const analysis = await analyzePreScreening(answers);
  await adminDb()
    .from("leads")
    .update({
      ai_type: analysis.type,
      ai_summary: analysis.summary,
      ai_judgement: analysis.judgement,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  await advanceLeadStatus(lead.id, "survey_answered");
  await advanceLeadStatus(lead.id, "ai_judged");

  revalidatePath("/mypage/survey");
  revalidatePath("/mypage");
  return { ok: true };
}
