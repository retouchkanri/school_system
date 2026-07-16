"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import type { Lead } from "@/lib/types";

const RULE_MESSAGES: Record<string, { title: string; body: (name: string) => string }> = {
  video_no_survey: {
    title: "【東関東馬事学院】入学仮審査アンケートのご案内",
    body: (name) =>
      `${name} 様\n\n学院紹介動画のご視聴ありがとうございました。\n` +
      `次のステップとして、マイページより「入学仮審査アンケート」へのご回答をお願いいたします。\n` +
      `ご回答いただくと、学校見学・オープンキャンパスのご予約にお進みいただけます。`,
  },
  survey_no_booking: {
    title: "【東関東馬事学院】学校見学・オープンキャンパスのご案内",
    body: (name) =>
      `${name} 様\n\n入学仮審査アンケートへのご回答ありがとうございました。\n` +
      `ぜひ一度、学校見学・オープンキャンパスへお越しください。実際の馬や寮、授業の様子をご覧いただけます。\n` +
      `マイページよりご希望の日程をご予約いただけます。`,
  },
  attended_no_application: {
    title: "【東関東馬事学院】出願のご案内",
    body: (name) =>
      `${name} 様\n\n先日は体験・見学にご参加いただきありがとうございました。\n` +
      `現在、出願を受付中です。マイページよりお手続きいただけます。\n` +
      `ご不明な点やご不安なことがあれば、お気軽にご相談ください。`,
  },
};

function isValidRule(rule: string): boolean {
  return FOLLOW_UP_RULES.some((r) => r.key === rule);
}

/** 1件のリードへフォロー通知を送り follow_up_logs に記録 */
async function sendToLead(leadId: string, rule: string): Promise<void> {
  const db = adminDb();
  const { data } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
  const lead = data as Lead | null;
  if (!lead) return;

  const msg = RULE_MESSAGES[rule];
  if (!msg) return;

  await notifyBoth(lead.email, lead.line_id, msg.title, msg.body(lead.name), "lead_followup");

  const logs: { lead_id: string; rule: string; channel: string }[] = [];
  if (lead.email) logs.push({ lead_id: lead.id, rule, channel: "email" });
  if (lead.line_id) logs.push({ lead_id: lead.id, rule, channel: "line" });
  if (logs.length > 0) {
    await db.from("follow_up_logs").insert(logs);
  }
}

/** フォロー送信 (1件) */
export async function sendFollowUpAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  const rule = String(formData.get("rule") ?? "");
  if (!leadId || !isValidRule(rule)) return;

  await sendToLead(leadId, rule);
  revalidatePath("/admin/follow-ups");
  revalidatePath("/admin");
}

/** フォロー一括送信 (ルールごと・未送信のみ) */
export async function sendFollowUpBulkAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const rule = String(formData.get("rule") ?? "");
  const ids = String(formData.get("lead_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || !isValidRule(rule)) return;

  for (const leadId of ids) {
    await sendToLead(leadId, rule);
  }
  revalidatePath("/admin/follow-ups");
  revalidatePath("/admin");
}
