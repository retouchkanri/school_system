"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { DECISION_DOCUMENTS } from "@/lib/constants";
import type { Lead } from "@/lib/types";

export interface DecisionActionState {
  ok?: boolean;
  error?: string;
}

const NOTIFY_CHANNELS = ["email", "line", "postal"] as const;

/** 合否登録 + 通知送信 */
export async function registerDecisionAction(
  _prev: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  await requireRole("admin");

  const leadId = String(formData.get("lead_id") ?? "");
  const result = String(formData.get("result") ?? "");
  if (!leadId) return { error: "対象者を選択してください" };
  if (result !== "accepted" && result !== "rejected" && result !== "waitlist") {
    return { error: "結果を選択してください" };
  }

  const notifiedVia = formData
    .getAll("notified_via")
    .map(String)
    .filter((v): v is (typeof NOTIFY_CHANNELS)[number] =>
      (NOTIFY_CHANNELS as readonly string[]).includes(v)
    );
  if (notifiedVia.length === 0) return { error: "通知方法を1つ以上選択してください" };

  const documentsSent: Record<string, boolean> = {};
  for (const doc of DECISION_DOCUMENTS) {
    documentsSent[doc.key] = formData.get(`doc_${doc.key}`) === "on";
  }

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
  if (existing) return { error: "この受験者は既に合否登録済みです" };

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

  const title =
    result === "accepted"
      ? "【東関東馬事学院】合格のお知らせ"
      : result === "waitlist"
        ? "【東関東馬事学院】選考結果(補欠)のお知らせ"
        : "【東関東馬事学院】選考結果のお知らせ";
  const body =
    result === "accepted"
      ? `${lead.name}様\n\n選考の結果、合格となりました。おめでとうございます!\n合否通知書ならびに同封書類をお送りしますので、内容をご確認のうえ入学手続きをお進めください。\n皆さまとお会いできる日を教職員一同、心よりお待ちしております。`
      : result === "waitlist"
        ? `${lead.name}様\n\n選考の結果、補欠合格となりました。\n繰り上げ合格となりました際には、改めてご連絡を差し上げます。詳細は同封書類をご確認ください。`
        : `${lead.name}様\n\n選考の結果、残念ながら今回はご期待に沿えない結果となりました。\nご出願いただきましたことに心より御礼申し上げます。またのご縁がありますことをお祈りしております。`;

  await notifyBoth(lead.email, lead.line_id, title, body, "admission_decision", {
    email: notifiedVia.includes("email"),
    line: notifiedVia.includes("line"),
  });

  revalidatePath("/admin/decisions");
  revalidatePath("/admin/enrollments");
  return { ok: true };
}
