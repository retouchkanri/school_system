"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { AudienceType } from "@/lib/types";
import { ANNOUNCEMENT_AUDIENCES, loadAnnouncementDirectory, resolveAnnouncementAudience } from "./audience";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** 1チャネル以上へ配信処理を実行できた宛先数 */
  count?: number;
  /** 配信対象の人数 (重複排除後) */
  targetCount?: number;
  emailCount?: number;
  lineCount?: number;
  audienceLabel?: string;
}

/** お知らせを作成し、対象者へメール/LINEを配信する */
export async function sendAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const audience = String(formData.get("audience") ?? "") as AudienceType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sendEmail = formData.get("send_email") === "on";
  const sendLine = formData.get("send_line") === "on";

  if (!ANNOUNCEMENT_AUDIENCES.includes(audience)) return { error: "配信対象を選択してください" };
  if (!title || !body) return { error: "タイトルと本文は必須です" };
  if (!sendEmail && !sendLine) return { error: "メール・LINEのいずれかの配信方法を選択してください" };

  const db = adminDb();
  const { error } = await db.from("announcements").insert({
    audience,
    title,
    body,
    send_email: sendEmail,
    send_line: sendLine,
    created_by: profile.id,
  });
  if (error) return { error: "お知らせの作成に失敗しました" };

  // 対象者の宛先を収集 (重複排除済み)
  const dir = await loadAnnouncementDirectory();
  const { stat, recipients } = resolveAnnouncementAudience(dir, audience);
  const emailCount = sendEmail ? recipients.filter((r) => r.email).length : 0;
  const lineCount = sendLine ? recipients.filter((r) => r.line_id).length : 0;

  const count = await notifyMany(recipients, title, body, "announcement", {
    email: sendEmail,
    line: sendLine,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/notifications");
  return {
    ok: true,
    count,
    targetCount: stat.total,
    emailCount,
    lineCount,
    audienceLabel: AUDIENCE_LABELS[audience],
  };
}
