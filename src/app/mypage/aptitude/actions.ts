"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { analyzeAptitude } from "@/lib/ai";
import { runAutomaticAdmissionDecision } from "@/lib/admission-decision";
import { APTITUDE_QUESTIONS } from "@/lib/aptitude";
import { isDevPhase } from "@/lib/dev";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 性格・適性検査(100問)の送信 → 採点・AIレポート生成 */
export async function submitAptitudeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  let answers: Record<string, number>;
  try {
    answers = JSON.parse(String(formData.get("answers") ?? "{}")) as Record<string, number>;
  } catch {
    return { error: "回答データが不正です" };
  }

  const invalid = APTITUDE_QUESTIONS.some((q) => {
    const v = answers[q.id];
    return typeof v !== "number" || v < 1 || v > 5;
  });
  if (invalid || Object.keys(answers).length < APTITUDE_QUESTIONS.length) {
    return { error: "未回答の設問があります。全100問にお答えください" };
  }

  const result = await analyzeAptitude(answers);

  const { error } = await adminDb()
    .from("aptitude_tests")
    .upsert(
      {
        lead_id: lead.id,
        answers,
        scores: result.scores,
        suitability: result.suitability,
        ai_report: result.report,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
  if (error) return { error: "結果の保存に失敗しました" };

  await advanceLeadStatus(lead.id, "aptitude_done");

  // 書類選考のみ(面接なし)の受験生は、適性検査の完了をもってAIが即座に合否を判定・通知する
  try {
    await runAutomaticAdmissionDecision(lead.id, { scores: result.scores, suitability: result.suitability });
  } catch {
    // 自動判定に失敗しても適性検査自体の提出は成立させる (管理者が後から手動判定できる)
  }

  revalidatePath("/mypage/aptitude");
  revalidatePath("/mypage");
  revalidatePath("/mypage/result");
  revalidatePath("/admin/decisions");
  revalidatePath("/admin/enrollments");

  // 開発フェーズ中は、面接・合否を待たずに入学手続きページの動作確認ができるよう直接遷移させる
  if (isDevPhase()) redirect("/mypage/enrollment");

  return { ok: true };
}
