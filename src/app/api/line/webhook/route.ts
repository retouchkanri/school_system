import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase/admin";

/**
 * LINE Messaging API Webhook。
 * LINE公式アカウントを友だち追加した本人の userId を取得し、
 * 登録済みメールアドレスと照合して leads / profiles の line_id に自動紐付けする。
 * これにより、以後の全通知(合否・入金確認・一斉配信など)がメールに加えてLINEにも届くようになる。
 *
 * 必要な環境変数:
 * - LINE_CHANNEL_SECRET       … 署名検証用 (LINE Developers > チャネル基本設定)
 * - LINE_CHANNEL_ACCESS_TOKEN … 返信・プッシュ送信用 (Messaging API設定)
 * LINE Developers コンソールで Webhook URL に https://<ドメイン>/api/line/webhook を設定してください。
 */

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
}

const FOLLOW_GREETING =
  "友だち追加ありがとうございます!\n東関東馬事高等学院・東関東馬事専門学院の公式LINEです。\n\n" +
  "ご登録済みのメールアドレスをこのトークに送信していただくと、アカウントと連携され、学院からの各種お知らせ(見学案内・合否通知・入金確認など)がLINEでも届くようになります。";

const LINK_SUCCESS = (name: string) =>
  `${name}様、LINE連携が完了しました!\n今後、学院からのお知らせはメールに加えてこのLINEにもお届けします。`;

const LINK_NOT_FOUND =
  "申し訳ありません。送信いただいたメールアドレスの登録が見つかりませんでした。\n" +
  "資料請求時にご入力いただいたメールアドレスをお確かめのうえ、もう一度お送りください。\n" +
  "ご不明な場合は学院までお問い合わせください。";

const GENERIC_GUIDE =
  "メッセージありがとうございます。\nアカウント連携がお済みでない方は、ご登録済みのメールアドレスをこのトークに送信してください。\n" +
  "その他のお問い合わせは、公式サイトのお問い合わせフォームをご利用ください。";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function replyMessage(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
    });
  } catch {
    // 返信失敗はWebhook応答(200)を妨げない
  }
}

/** メールアドレスで leads / profiles を照合し、LINE userId を紐付ける。成功時は登録名を返す */
async function linkLineId(email: string, lineUserId: string): Promise<string | null> {
  const db = adminDb();
  const normalized = email.trim().toLowerCase();

  const [{ data: profileData }, { data: leadData }] = await Promise.all([
    db.from("profiles").select("id, full_name, email").ilike("email", normalized).maybeSingle(),
    db.from("leads").select("id, name, email").ilike("email", normalized).limit(1).maybeSingle(),
  ]);
  const profile = profileData as { id: string; full_name: string } | null;
  const lead = leadData as { id: string; name: string } | null;
  if (!profile && !lead) return null;

  if (profile) await db.from("profiles").update({ line_id: lineUserId }).eq("id", profile.id);
  if (lead) await db.from("leads").update({ line_id: lineUserId }).eq("id", lead.id);
  return profile?.full_name ?? lead?.name ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(rawBody).events as LineEvent[]) ?? [];
  } catch {
    return NextResponse.json({ received: true });
  }

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (event.type === "follow" && event.replyToken) {
      await replyMessage(event.replyToken, FOLLOW_GREETING);
      continue;
    }

    if (event.type === "message" && event.message?.type === "text" && event.replyToken) {
      const text = (event.message.text ?? "").trim();
      const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (emailMatch) {
        const name = await linkLineId(emailMatch[0], userId);
        await replyMessage(event.replyToken, name ? LINK_SUCCESS(name) : LINK_NOT_FOUND);
      } else {
        await replyMessage(event.replyToken, GENERIC_GUIDE);
      }
    }
  }

  // LINEプラットフォームへは常に200を返す (再送ループ防止)
  return NextResponse.json({ received: true });
}
