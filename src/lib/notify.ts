import { adminDb } from "@/lib/supabase/admin";
import type { NotifyChannel } from "@/lib/types";

/**
 * メール / LINE 送信モジュール。
 * デモ環境では notifications テーブルに送信ログとして記録する。
 * 本番では sendEmail に SMTP/SendGrid、sendLine に LINE Messaging API
 * (LINE_CHANNEL_ACCESS_TOKEN) を接続する。
 */

export interface NotifyPayload {
  channel: NotifyChannel;
  recipient: string; // メールアドレス or LINE ID
  title: string;
  body?: string;
  relatedType?: string;
}

export async function sendNotification(payload: NotifyPayload) {
  await adminDb().from("notifications").insert({
    channel: payload.channel,
    recipient: payload.recipient,
    title: payload.title,
    body: payload.body ?? null,
    related_type: payload.relatedType ?? null,
  });
}

/** メール+LINE の両チャネルへまとめて送信 */
export async function notifyBoth(
  email: string | null,
  lineId: string | null,
  title: string,
  body: string,
  relatedType: string,
  opts: { email?: boolean; line?: boolean } = { email: true, line: true }
) {
  const rows: object[] = [];
  if (opts.email !== false && email) {
    rows.push({ channel: "email", recipient: email, title, body, related_type: relatedType });
  }
  if (opts.line !== false && lineId) {
    rows.push({ channel: "line", recipient: lineId, title, body, related_type: relatedType });
  }
  if (rows.length > 0) {
    await adminDb().from("notifications").insert(rows);
  }
  return rows.length;
}
