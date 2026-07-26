import { NextResponse } from "next/server";
import { emailConfigStatus, verifySmtp, sendTestEmail, sendWelcomeEmailTest } from "@/lib/notify";

/**
 * メール配信の診断・テスト送信エンドポイント。
 * 資料請求の自動返信メールが届かない場合の原因特定 (SMTP設定・接続・認証・送信) に使う。
 *
 * 使い方 (EMAIL_DIAGNOSTIC_KEY を環境変数に設定した上で):
 *   1) 設定と接続・認証のみ確認   : GET /api/dev/email-diagnostic?key=<KEY>
 *   2) 簡単なテストメールを送信   : GET /api/dev/email-diagnostic?key=<KEY>&to=<宛先>
 *   3) 実際の自動返信メールを送信 : GET /api/dev/email-diagnostic?key=<KEY>&to=<宛先>&welcome=1
 *      (本番と同じ本文+2つの申込用紙の添付。DBには一切登録されない安全なテスト)
 *
 * EMAIL_DIAGNOSTIC_KEY 未設定時は 404 (既定で無効・安全)。確認後は環境変数を削除して無効化してください。
 */
export async function GET(req: Request) {
  const key = process.env.EMAIL_DIAGNOSTIC_KEY;
  const url = new URL(req.url);
  if (!key || url.searchParams.get("key") !== key) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const config = emailConfigStatus();
  const verify = await verifySmtp(); // 接続・認証の検証 (送信はしない)

  const to = url.searchParams.get("to");
  const wantWelcome = url.searchParams.get("welcome") === "1";
  const origin = url.origin;

  let send = null;
  if (to) {
    send = wantWelcome
      ? await sendWelcomeEmailTest(to, origin) // 本番と同じ自動返信メール(添付あり)
      : await sendTestEmail(to); // 簡易テストメール
  }

  return NextResponse.json(
    {
      ok: verify.ok && (send ? send.ok : true),
      sent: send ? (wantWelcome ? "資料請求の自動返信メール(添付あり)" : "簡易テストメール") : null,
      config, // シークレット値は含まない (設定有無のみ)
      verify, // { ok, port, error } — 接続/認証の結果
      send, // to 指定時のみ: { ok, port, messageId, error } — 実送信の結果
      hint:
        "verify/send の error に 'timeout' が出れば送信元からGmailへの接続が遮断されています。" +
        "'Invalid login'/'535' なら SMTP_USER/SMTP_PASS(Googleアプリパスワード)が誤りです。" +
        "config.resolved_transport が 'none' なら NOTIFY_TRANSPORT/SMTP_HOST がデプロイ先に未設定です。" +
        "send.ok が true なのに届かない場合は迷惑メールフォルダをご確認ください。",
    },
    { status: 200 }
  );
}
