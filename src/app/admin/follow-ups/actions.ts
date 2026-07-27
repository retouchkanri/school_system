"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { isFollowUpRule, sendFollowUpToLead, runAutomaticFollowUps } from "@/lib/follow-ups";
import type { Lead } from "@/lib/types";

async function sendToLeadId(leadId: string, rule: string): Promise<void> {
  if (!isFollowUpRule(rule)) return;
  const { data } = await adminDb().from("leads").select("*").eq("id", leadId).maybeSingle();
  const lead = data as Lead | null;
  if (!lead) return;
  await sendFollowUpToLead(lead, rule);
}

/** フォロー送信 (1件・管理者の手動操作) */
export async function sendFollowUpAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  const rule = String(formData.get("rule") ?? "");
  if (!leadId || !isFollowUpRule(rule)) return;

  await sendToLeadId(leadId, rule);
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
  if (ids.length === 0 || !isFollowUpRule(rule)) return;

  for (const leadId of ids) {
    await sendToLeadId(leadId, rule);
  }
  revalidatePath("/admin/follow-ups");
  revalidatePath("/admin");
}

/** 自動送信設定の保存 (ルールごとのON/OFFと待機日数) */
export async function saveFollowUpSettingAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const rule = String(formData.get("rule") ?? "");
  if (!isFollowUpRule(rule)) return;

  const autoEnabled = formData.get("auto_enabled") === "on";
  const minDaysRaw = Number(formData.get("min_days"));
  const minDays = Number.isFinite(minDaysRaw) ? Math.max(0, Math.min(365, Math.round(minDaysRaw))) : 3;

  await adminDb().from("follow_up_settings").upsert(
    { rule, auto_enabled: autoEnabled, min_days: minDays, updated_at: new Date().toISOString() },
    { onConflict: "rule" }
  );

  revalidatePath("/admin/follow-ups");
}

/** 自動送信を今すぐ手動実行する (cronを待たずに動作確認・当日中の配信をしたい場合) */
export async function runAutoFollowUpsNowAction(): Promise<void> {
  await requireRole("admin");
  await runAutomaticFollowUps();
  revalidatePath("/admin/follow-ups");
  revalidatePath("/admin");
}
