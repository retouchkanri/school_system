import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { analyzeAdmissionDecision } from "@/lib/ai";
import { DECISION_DOCUMENTS } from "@/lib/constants";
import { isApplicationDocumentFile } from "@/lib/documents";
import type { Application, Lead } from "@/lib/types";
import type { TraitKey } from "@/lib/aptitude";

const APPLICATION_FILE_DOC_KEYS = ["application_form", "photo", "transcript"] as const;

function composeDecisionMessage(name: string, result: "accepted" | "rejected"): { title: string; body: string } {
  if (result === "accepted") {
    const docList = DECISION_DOCUMENTS.map((d) => `・${d.label}`).join("\n");
    return {
      title: "【東関東馬事学院】合格のお知らせ",
      body:
        `${name}様\n\n書類選考(適性検査含む)の結果、合格となりました。おめでとうございます!\n\n` +
        `つきましては、以下の書類をお送りいたします。内容をご確認のうえ、入学手続きをお進めください。\n\n` +
        `${docList}\n\n` +
        `入学手続きの詳細はマイページの「入学手続き」ページよりご案内しております。\n` +
        `皆さまとお会いできる日を教職員一同、心よりお待ちしております。`,
    };
  }
  return {
    title: "【東関東馬事学院】選考結果のお知らせ",
    body:
      `${name}様\n\n書類選考(適性検査含む)の結果、誠に残念ながら今回はご期待に沿えない結果となりました。\n\n` +
      `${DECISION_DOCUMENTS[0].label}を別途お送りいたします。\n\n` +
      `ご出願いただきましたことに心より御礼申し上げます。またのご縁がありますことをお祈りしております。`,
  };
}

/**
 * 適性検査の完了直後に呼び出す。面接を伴わない書類選考のみの受験生について、
 * AIが即座に合否を判定・登録し、メール・LINEで結果と同封書類の案内を通知する。
 * 面接予定がある受験生や、既に合否登録済みの受験生には何もしない(管理者の手動判定に委ねる)。
 */
export async function runAutomaticAdmissionDecision(
  leadId: string,
  aptitude: { scores: Record<TraitKey, number> | null; suitability: Record<string, number> | null }
): Promise<void> {
  const db = adminDb();

  const [{ data: existingDecision }, { data: appData }, { data: leadData }] = await Promise.all([
    db.from("admission_decisions").select("id").eq("lead_id", leadId).maybeSingle(),
    db.from("applications").select("*").eq("lead_id", leadId).maybeSingle(),
    db.from("leads").select("*").eq("id", leadId).maybeSingle(),
  ]);
  if (existingDecision) return; // 既に合否登録済み (管理者による手動判定を優先)

  const application = appData as Application | null;
  const lead = leadData as Lead | null;
  if (!application || !lead) return;
  if (application.interview_date) return; // 面接予定がある受験生は面接後に管理者が判定

  const documentsSubmittedCount = APPLICATION_FILE_DOC_KEYS.filter((key) =>
    isApplicationDocumentFile(application.documents[key])
  ).length;

  const decision = await analyzeAdmissionDecision({
    aptitudeScores: aptitude.scores,
    aptitudeSuitability: aptitude.suitability,
    enrollmentProbability: lead.ai_enrollment_probability,
    preScreeningSummary: lead.ai_summary,
    documentsSubmittedCount,
    hasEssay: !!application.essay?.trim(),
  });

  const documentsSent: Record<string, boolean> =
    decision.result === "accepted"
      ? Object.fromEntries(DECISION_DOCUMENTS.map((d) => [d.key, true]))
      : { [DECISION_DOCUMENTS[0].key]: true };

  const { error } = await db.from("admission_decisions").insert({
    lead_id: leadId,
    result: decision.result,
    notified_via: ["email", "line"],
    documents_sent: documentsSent,
    ai_probability: decision.probability,
    ai_summary: decision.summary,
    notified_at: new Date().toISOString(),
  });
  if (error) return;

  await db.from("applications").update({ status: "decided" }).eq("lead_id", leadId);
  await advanceLeadStatus(leadId, "decision_sent");

  const { title, body } = composeDecisionMessage(lead.name, decision.result);
  await notifyBoth(lead.email, lead.line_id, title, body, "admission_decision");
}
