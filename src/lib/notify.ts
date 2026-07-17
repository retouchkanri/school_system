import nodemailer, { type Transporter } from "nodemailer";
import { adminDb } from "@/lib/supabase/admin";
import type { NotifyChannel } from "@/lib/types";

/**
 * メール / LINE 送信モジュール。
 * NOTIFY_TRANSPORT=smtp (または SMTP_HOST 設定時) は SMTP (nodemailer) で実配信。
 * それ以外で RESEND_API_KEY が設定されていれば Resend API で実配信。
 * LINE_CHANNEL_ACCESS_TOKEN が設定されていれば LINE Messaging API で実配信。
 * いずれも未設定の場合は notifications テーブルへの送信ログ記録のみ(安全にフォールバック)。
 * 実配信の成否に関わらず、必ず notifications テーブルにもログを残す(管理画面の送信ログ用)。
 */

export interface NotifyPayload {
  channel: NotifyChannel;
  recipient: string; // メールアドレス or LINE ID
  title: string;
  body?: string;
  relatedType?: string;
}

let _transporter: Transporter | null | undefined;

function smtpTransporter(): Transporter | null {
  if (_transporter !== undefined) return _transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    _transporter = null;
    return null;
  }
  _transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return _transporter;
}

function mailFrom(): string {
  const addr = process.env.MAIL_FROM || process.env.EMAIL_FROM || "no-reply@bajigakuin.jp";
  const name = process.env.MAIL_FROM_NAME;
  return name ? `"${name}" <${addr}>` : addr;
}

async function deliverEmail(to: string, title: string, body: string) {
  const useSmtp = process.env.NOTIFY_TRANSPORT === "smtp" || (!process.env.NOTIFY_TRANSPORT && !!process.env.SMTP_HOST);

  if (useSmtp) {
    const transporter = smtpTransporter();
    if (!transporter) return;
    try {
      await transporter.sendMail({
        from: mailFrom(),
        to,
        subject: title,
        text: body,
        replyTo: process.env.CONTACT_EMAIL || undefined,
      });
    } catch {
      // 実配信の失敗は notifications ログの記録を妨げない (呼び出し元で常にログは残す)
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: mailFrom(), to, subject: title, text: body }),
    });
  } catch {
    // 実配信の失敗は notifications ログの記録を妨げない
  }
}

async function deliverLine(to: string, title: string, body: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, messages: [{ type: "text", text: `${title}\n${body}` }] }),
    });
  } catch {
    // 実配信の失敗は notifications ログの記録を妨げない
  }
}

export async function sendNotification(payload: NotifyPayload) {
  const body = payload.body ?? "";
  if (payload.channel === "email") await deliverEmail(payload.recipient, payload.title, body);
  else await deliverLine(payload.recipient, payload.title, body);

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
  const sends: Promise<void>[] = [];
  let count = 0;
  if (opts.email !== false && email) {
    sends.push(sendNotification({ channel: "email", recipient: email, title, body, relatedType }));
    count++;
  }
  if (opts.line !== false && lineId) {
    sends.push(sendNotification({ channel: "line", recipient: lineId, title, body, relatedType }));
    count++;
  }
  await Promise.all(sends);
  return count;
}

/**
 * 職員向け通知(個別相談希望など)の送信先一覧。
 * CONTACT_RECIPIENTS(カンマ区切り)が設定されていればそれを優先し、
 * 未設定の場合は管理者ロールの登録メールアドレスへフォールバックする。
 */
export function staffNotifyRecipients(fallback: string[]): string[] {
  const configured = (process.env.CONTACT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : fallback;
}

/** 職員向け通知をまとめて送信 (メールのみ、CONTACT_RECIPIENTS優先) */
export async function notifyStaff(title: string, body: string, relatedType: string, fallbackEmails: string[]) {
  const recipients = staffNotifyRecipients(fallbackEmails);
  await Promise.all(
    recipients.map((email) => sendNotification({ channel: "email", recipient: email, title, body, relatedType }))
  );
  return recipients.length;
}
