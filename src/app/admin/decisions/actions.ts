"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { DECISION_DOCUMENTS } from "@/lib/constants";
import type { AdmissionResult, Lead } from "@/lib/types";

export interface DecisionActionState {
  ok?: boolean;
  error?: string;
}

const NOTIFY_CHANNELS = ["email", "line", "postal"] as const;

function parseResult(formData: FormData): AdmissionResult | null {
  const result = String(formData.get("result") ?? "");
  if (result !== "accepted" && result !== "rejected" && result !== "waitlist") return null;
  return result;
}

function parseNotifiedVia(formData: FormData): (typeof NOTIFY_CHANNELS)[number][] {
  return formData
    .getAll("notified_via")
    .map(String)
    .filter((v): v is (typeof NOTIFY_CHANNELS)[number] => (NOTIFY_CHANNELS as readonly string[]).includes(v));
}

function parseDocumentsSent(formData: FormData): Record<string, boolean> {
  const documentsSent: Record<string, boolean> = {};
  for (const doc of DECISION_DOCUMENTS) {
    documentsSent[doc.key] = formData.get(`doc_${doc.key}`) === "on";
  }
  return documentsSent;
}

/** 合否結果メール・LINE通知の本文を組み立てる。isAmendment=true の場合は訂正通知として文面を変える */
function composeDecisionMessage(
  name: string,
  result: AdmissionResult,
  documentsSent: Record<string, boolean>,
  opts: { isAmendment?: boolean } = {}
): { title: string; body: string } {
  const sentDocLabels = DECISION_DOCUMENTS.filter((d) => documentsSent[d.key]).map((d) => `・${d.label}`);
  const docListText = sentDocLabels.length > 0 ? `\n\n${sentDocLabels.join("\n")}` : "";
  const prefix = opts.isAmendment ? "先にお送りした選考結果について、内容を訂正してお知らせいたします。\n\n" : "";

  if (opts.isAmendment) {
    const title =
      result === "accepted"
        ? "【東関東馬事学院】合格通知の訂正について"
        : result === "waitlist"
          ? "【東関東馬事学院】選考結果(補欠)の訂正について"
          : "【東関東馬事学院】選考結果の訂正について";
    const body =
      result === "accepted"
        ? `${name}様\n\n${prefix}選考の結果、合格となりました。おめでとうございます!\n以下の書類をお送りしますので、内容をご確認のうえ入学手続きをお進めください。${docListText}\n\n皆さまとお会いできる日を教職員一同、心よりお待ちしております。`
        : result === "waitlist"
          ? `${name}様\n\n${prefix}選考の結果、補欠合格となりました。\n繰り上げ合格となりました際には、改めてご連絡を差し上げます。${docListText}`
          : `${name}様\n\n${prefix}選考の結果、誠に残念ながら今回はご期待に沿えない結果となりました。${docListText}\n\nご出願いただきましたことに心より御礼申し上げます。またのご縁がありますことをお祈りしております。`;
    return { title, body };
  }

  const title =
    result === "accepted"
      ? "【東関東馬事学院】合格のお知らせ"
      : result === "waitlist"
        ? "【東関東馬事学院】選考結果(補欠)のお知らせ"
        : "【東関東馬事学院】選考結果のお知らせ";
  const body =
    result === "accepted"
      ? `${name}様\n\n選考の結果、合格となりました。おめでとうございます!\n以下の書類をお送りしますので、内容をご確認のうえ入学手続きをお進めください。${docListText}\n\n皆さまとお会いできる日を教職員一同、心よりお待ちしております。`
      : result === "waitlist"
        ? `${name}様\n\n選考の結果、補欠合格となりました。\n繰り上げ合格となりました際には、改めてご連絡を差し上げます。${docListText}`
        : `${name}様\n\n選考の結果、残念ながら今回はご期待に沿えない結果となりました。${docListText}\n\nご出願いただきましたことに心より御礼申し上げます。またのご縁がありますことをお祈りしております。`;
  return { title, body };
}

/** 合否登録 + 通知送信 (未登録の受験者に対する新規登録) */
export async function registerDecisionAction(
  _prev: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  await requireRole("admin");

  const leadId = String(formData.get("lead_id") ?? "");
  const result = parseResult(formData);
  if (!leadId) return { error: "対象者を選択してください" };
  if (!result) return { error: "結果を選択してください" };

  const notifiedVia = parseNotifiedVia(formData);
  if (notifiedVia.length === 0) return { error: "通知方法を1つ以上選択してください" };

  const documentsSent = parseDocumentsSent(formData);

  const db = adminDb();
  const { data: leadData } = await db
    .from("leads")
    .select("id, name, email, line_id")
    .eq("id", leadId)
    .single();
  const lead = leadData as Pick<Lead, "id" | "name" | "email" | "line_id"> | null;
  if (!lead) return { error: "対象者が見つかりません" };

  const { data: existing } = await db
    .from("admission_decisions")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existing) return { error: "この受験者は既に合否登録済みです。変更する場合は一覧の「変更する」から行ってください" };

  const { error } = await db.from("admission_decisions").insert({
    lead_id: leadId,
    result,
    notified_via: notifiedVia,
    documents_sent: documentsSent,
    notified_at: new Date().toISOString(),
  });
  if (error) return { error: "合否の登録に失敗しました" };

  await db.from("applications").update({ status: "decided" }).eq("lead_id", leadId);
  await advanceLeadStatus(leadId, "decision_sent");

  const { title, body } = composeDecisionMessage(lead.name, result, documentsSent);
  await notifyBoth(lead.email, lead.line_id, title, body, "admission_decision", {
    email: notifiedVia.includes("email"),
    line: notifiedVia.includes("line"),
  });

  revalidatePath("/admin/decisions");
  revalidatePath("/admin/enrollments");
  return { ok: true };
}

/**
 * 登録済みの合否判定を管理者が変更する (AIによる自動判定の訂正を含む)。
 * 結果・通知方法・同封書類を変更のうえ、訂正の通知を改めて送信する。
 */
export async function amendDecisionAction(
  _prev: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  await requireRole("admin");

  const decisionId = String(formData.get("decision_id") ?? "");
  const result = parseResult(formData);
  if (!decisionId) return { error: "対象の判定が見つかりません" };
  if (!result) return { error: "結果を選択してください" };

  const notifiedVia = parseNotifiedVia(formData);
  if (notifiedVia.length === 0) return { error: "通知方法を1つ以上選択してください" };

  const documentsSent = parseDocumentsSent(formData);

  const db = adminDb();
  const { data: existing } = await db
    .from("admission_decisions")
    .select("id, lead_id")
    .eq("id", decisionId)
    .maybeSingle();
  if (!existing) return { error: "対象の判定が見つかりません" };

  const { data: leadData } = await db
    .from("leads")
    .select("id, name, email, line_id")
    .eq("id", existing.lead_id)
    .single();
  const lead = leadData as Pick<Lead, "id" | "name" | "email" | "line_id"> | null;
  if (!lead) return { error: "対象者が見つかりません" };

  const now = new Date().toISOString();
  const { error } = await db
    .from("admission_decisions")
    .update({
      result,
      notified_via: notifiedVia,
      documents_sent: documentsSent,
      notified_at: now,
      amended_at: now,
    })
    .eq("id", decisionId);
  if (error) return { error: "判定の更新に失敗しました" };

  await db.from("applications").update({ status: "decided" }).eq("lead_id", lead.id);

  const { title, body } = composeDecisionMessage(lead.name, result, documentsSent, { isAmendment: true });
  await notifyBoth(lead.email, lead.line_id, title, body, "admission_decision", {
    email: notifiedVia.includes("email"),
    line: notifiedVia.includes("line"),
  });

  revalidatePath("/admin/decisions");
  revalidatePath("/admin/enrollments");
  revalidatePath("/mypage/result");
  return { ok: true };
}
