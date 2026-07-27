import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import { adminDb } from "@/lib/supabase/admin";
import type { NotifyChannel } from "@/lib/types";

/**
 * メール / LINE 送信モジュール。
 * NOTIFY_TRANSPORT=smtp (または SMTP_HOST 設定時) は SMTP (nodemailer) で実配信。
 * それ以外で RESEND_API_KEY が設定されていれば Resend API で実配信。
 * LINE_CHANNEL_ACCESS_TOKEN が設定されていれば LINE Messaging API で実配信。
 * いずれも未設定の場合は notifications テーブルへの送信ログ記録のみ(安全にフォールバック)。
 * 実配信の成否に関わらず、必ず notifications テーブルにもログを残す(管理画面の送信ログ用)。
 *
 * 注意: 送信は「レスポンス応答後 (after)」ではなく呼び出し時に await して行うこと。
 * Vercel等のサーバーレス環境では応答後に関数が凍結され、SMTP送信が完了しないことがあるため。
 */

/**
 * メール添付ファイル。
 * content=バッファ添付 (推奨・確実)。href=URLから取得して添付 (URLが200を返せる場合のみ。
 * nodemailerはhref取得が非200だとメール全体を失敗させるため、確実性が必要な場面ではcontentを使う)。
 */
export interface EmailAttachment {
  filename: string;
  content?: Buffer;
  href?: string;
}

export interface NotifyPayload {
  channel: NotifyChannel;
  recipient: string; // メールアドレス or LINE ID
  title: string;
  body?: string;
  relatedType?: string;
  attachments?: EmailAttachment[];
}

/**
 * SMTPホスト名を正規化 (前後の空白・誤って含まれた引用符を除去)。
 * 環境変数をコンソールへ貼り付ける際の事故を吸収する。
 */
function smtpHost(): string | undefined {
  return process.env.SMTP_HOST?.trim().replace(/^["']|["']$/g, "") || undefined;
}

function smtpUser(): string | undefined {
  return process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, "") || undefined;
}

/**
 * SMTPパスワードを正規化。
 * Googleのアプリパスワードは管理画面で「abcd efgh ijkl mnop」と4桁区切りで表示されるため、
 * 空白ごとコピーされることが非常に多い。空白を含むと認証は 535-5.7.8 で必ず失敗するので、
 * 空白と前後の引用符を除去してから使用する。
 */
function smtpPass(): string | undefined {
  return process.env.SMTP_PASS?.replace(/\s+/g, "").replace(/^["']|["']$/g, "") || undefined;
}

function buildTransport(port: number, secure: boolean): Transporter {
  const user = smtpUser();
  return nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure, // 465=true(暗黙TLS) / 587=false(STARTTLS)
    auth: user ? { user, pass: smtpPass() } : undefined,
    // SMTP接続先が不安定/到達不能でもリクエストが長時間ブロックされないよう上限を設ける
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

export interface SmtpSendResult {
  ok: boolean;
  port?: number;
  messageId?: string;
  error?: string;
}

/**
 * SMTP送信を試みる。設定ポート(既定465/secure)で失敗したら、もう一方(587/STARTTLS または 465/secure)に
 * フォールバックする。ポート固有の遮断に強くするため。成功可否・使用ポート・エラーを返す。
 */
async function smtpSendMail(mail: SendMailOptions): Promise<SmtpSendResult> {
  const host = smtpHost();
  if (!host) return { ok: false, error: "SMTP_HOST が未設定です" };

  const primaryPort = Number(process.env.SMTP_PORT ?? 465);
  const primarySecure = process.env.SMTP_SECURE !== "false";
  const attempts: [number, boolean][] = [[primaryPort, primarySecure]];
  // フォールバック: 465↔587 のもう一方を試す
  attempts.push(primaryPort === 465 ? [587, false] : [465, true]);

  let lastError = "";
  for (const [port, secure] of attempts) {
    try {
      const info = await buildTransport(port, secure).sendMail(mail);
      return { ok: true, port, messageId: info.messageId };
    } catch (e) {
      lastError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.error(`[notify] SMTP送信失敗 (port ${port}, secure=${secure}):`, lastError);
    }
  }
  return { ok: false, error: lastError };
}

function mailFrom(): string {
  const addr = process.env.MAIL_FROM || process.env.EMAIL_FROM || "no-reply@bajigakuin.jp";
  const name = process.env.MAIL_FROM_NAME;
  return name ? `"${name}" <${addr}>` : addr;
}

async function deliverEmail(to: string, title: string, body: string, attachments?: EmailAttachment[]) {
  const useSmtp = process.env.NOTIFY_TRANSPORT === "smtp" || (!process.env.NOTIFY_TRANSPORT && !!process.env.SMTP_HOST);

  if (useSmtp) {
    const result = await smtpSendMail({
      from: mailFrom(),
      to,
      subject: title,
      text: body,
      replyTo: process.env.CONTACT_EMAIL || undefined,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, href: a.href })),
    });
    if (result.ok) {
      console.info("[notify] メール送信成功:", to, `port ${result.port}`, result.messageId ?? "");
      return;
    }
    // 実配信の失敗は notifications ログの記録を妨げない。原因調査のため必ずログに出す(Vercelのファンクションログで確認可能)。
    console.error("[notify] SMTPメール送信失敗 (全経路):", to, result.error);
    // SMTPが遮断/失敗しても、RESEND_API_KEY があれば Resend(HTTPS API)へ自動フォールバックする。
    if (process.env.RESEND_API_KEY) {
      console.info("[notify] Resend へフォールバックします:", to);
      await resendSend(to, title, body, attachments);
    }
    return;
  }

  await resendSend(to, title, body, attachments);
}

/** Resend (HTTPS API) でメール送信。SMTPポートが遮断される環境(サーバーレス等)向けの手段 */
async function resendSend(to: string, title: string, body: string, attachments?: EmailAttachment[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[notify] メール配信手段が未設定 (NOTIFY_TRANSPORT=smtp か RESEND_API_KEY が必要) のため未送信:", to);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: mailFrom(),
        to,
        subject: title,
        text: body,
        attachments: attachments?.map((a) =>
          a.content
            ? { filename: a.filename, content: a.content.toString("base64") }
            : { filename: a.filename, path: a.href }
        ),
      }),
    });
    if (res.ok) console.info("[notify] Resendメール送信成功:", to);
    else console.error("[notify] Resendメール送信失敗:", to, res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[notify] Resendメール送信失敗:", to, e);
  }
}

async function deliverLine(to: string, title: string, body: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, messages: [{ type: "text", text: `${title}\n${body}` }] }),
    });
    if (!res.ok) console.error("[notify] LINE送信失敗:", to, res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[notify] LINE送信失敗:", to, e);
  }
}

/* ============ 診断用 (メールが届かない原因を特定するため) ============ */

/** メール設定の状態を返す (シークレットの値そのものは含めず、形式の検査結果のみ)。診断エンドポイント用 */
export function emailConfigStatus() {
  const useSmtp = process.env.NOTIFY_TRANSPORT === "smtp" || (!process.env.NOTIFY_TRANSPORT && !!process.env.SMTP_HOST);
  const rawPass = process.env.SMTP_PASS ?? "";
  const cleanPass = smtpPass() ?? "";
  const rawUser = process.env.SMTP_USER ?? "";

  return {
    NOTIFY_TRANSPORT: process.env.NOTIFY_TRANSPORT ?? null,
    SMTP_HOST: process.env.SMTP_HOST ?? null,
    SMTP_PORT: process.env.SMTP_PORT ?? null,
    SMTP_SECURE: process.env.SMTP_SECURE ?? null,
    SMTP_USER: process.env.SMTP_USER ?? null,
    SMTP_PASS_present: !!process.env.SMTP_PASS,
    MAIL_FROM: process.env.MAIL_FROM || process.env.EMAIL_FROM || null,
    MAIL_FROM_NAME: process.env.MAIL_FROM_NAME ?? null,
    RESEND_API_KEY_present: !!process.env.RESEND_API_KEY,
    resolved_transport: useSmtp ? "smtp" : process.env.RESEND_API_KEY ? "resend" : "none(ログのみ)",

    /** 認証情報の形式チェック (値そのものは出力しない。535エラーの原因切り分け用) */
    credential_check: {
      // Googleアプリパスワードは英小文字16桁。空白除去後にこの形式でなければ設定ミス
      pass_length_raw: rawPass.length,
      pass_length_normalized: cleanPass.length,
      pass_had_whitespace: /\s/.test(rawPass),
      pass_had_quotes: /^["']|["']$/.test(rawPass),
      pass_is_16_lowercase_letters: /^[a-z]{16}$/.test(cleanPass),
      user_had_whitespace: rawUser !== rawUser.trim(),
      user_is_email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawUser.trim()),
      // SMTP_USER と MAIL_FROM が別アカウントだとGmailは送信を拒否することがある
      user_matches_mail_from:
        rawUser.trim().toLowerCase() === (process.env.MAIL_FROM ?? "").trim().toLowerCase(),
    },
  };
}

/** SMTPの接続・認証のみを検証する (メールは送らない)。診断エンドポイント用 */
export async function verifySmtp(): Promise<SmtpSendResult> {
  const host = smtpHost();
  if (!host) return { ok: false, error: "SMTP_HOST が未設定です" };
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  try {
    await buildTransport(port, secure).verify();
    return { ok: true, port };
  } catch (e) {
    return { ok: false, port, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

/** テストメールを実際に送信して結果(成功/エラー)を返す。診断エンドポイント用 */
export async function sendTestEmail(to: string): Promise<SmtpSendResult> {
  return smtpSendMail({
    from: mailFrom(),
    to,
    subject: "【東関東馬事学院】メール送信テスト",
    text: "これはメール配信の動作確認用テストです。\nこのメールが届いていれば、SMTP設定は正常に機能しています。",
    replyTo: process.env.CONTACT_EMAIL || undefined,
  });
}

/**
 * 資料請求の自動返信メールと全く同じ内容(本文+2つの申込用紙の添付)をテスト送信する。
 * DBには何も登録しないため、本番環境でも安全に配信内容を確認できる。診断エンドポイント用。
 */
export async function sendWelcomeEmailTest(to: string, origin: string): Promise<SmtpSendResult> {
  const { WELCOME_SUBJECT, welcomeEmailBody } = await import("@/lib/welcome-email");
  const { formAttachments } = await import("@/lib/form-attachments");
  return smtpSendMail({
    from: mailFrom(),
    to,
    subject: WELCOME_SUBJECT,
    text: welcomeEmailBody({ name: "テスト 太郎", email: to, birthDateLogin: true, origin }),
    replyTo: process.env.CONTACT_EMAIL || undefined,
    attachments: formAttachments().map((a) => ({ filename: a.filename, content: a.content })),
  });
}

export async function sendNotification(payload: NotifyPayload) {
  const body = payload.body ?? "";
  if (payload.channel === "email") await deliverEmail(payload.recipient, payload.title, body, payload.attachments);
  else await deliverLine(payload.recipient, payload.title, body);

  await adminDb().from("notifications").insert({
    channel: payload.channel,
    recipient: payload.recipient,
    title: payload.title,
    body: payload.body ?? null,
    related_type: payload.relatedType ?? null,
  });
}

/** メール+LINE の両チャネルへまとめて送信。attachments はメールにのみ添付される (LINEは非対応) */
export async function notifyBoth(
  email: string | null,
  lineId: string | null,
  title: string,
  body: string,
  relatedType: string,
  opts: { email?: boolean; line?: boolean; attachments?: EmailAttachment[] } = { email: true, line: true }
) {
  const sends: Promise<void>[] = [];
  let count = 0;
  if (opts.email !== false && email) {
    sends.push(sendNotification({ channel: "email", recipient: email, title, body, relatedType, attachments: opts.attachments }));
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
 * 多数の宛先へメール+LINEをまとめて送信する (10件ずつの並列送信)。
 * SMTPのタイムアウト(最大8秒/通)があっても、宛先数に比例して長時間ブロックしないようにする。
 * 戻り値は1チャネル以上へ送信できた宛先数。
 */
export async function notifyMany(
  recipients: { email: string | null; line_id: string | null }[],
  title: string,
  body: string,
  relatedType: string,
  opts: { email?: boolean; line?: boolean } = { email: true, line: true }
): Promise<number> {
  const CHUNK = 10;
  let count = 0;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const results = await Promise.all(
      recipients.slice(i, i + CHUNK).map((r) => notifyBoth(r.email, r.line_id, title, body, relatedType, opts))
    );
    count += results.filter((sent) => sent > 0).length;
  }
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
