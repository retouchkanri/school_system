import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `あなたは東関東馬事高等学院・東関東馬事専門学院の公式サイトアシスタントです。
入学、見学予約、資料請求、学費、寮生活、馬とのふれあい、進路などについて、丁寧な日本語で回答してください。
サイト上でできること(資料請求、マイページ、お問い合わせフォームなど)があれば案内してください。
確実な情報がない場合や個別の判断が必要な場合は、学院へのお問い合わせを案内してください。`;

type ChatMessage = { role: "user" | "assistant"; content: string };

// 公開エンドポイントのため、IPごとの簡易レート制限で有償APIの濫用を防ぐ (1分あたり10リクエスト)
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_LIMIT) {
    rateBuckets.set(ip, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 10_000) rateBuckets.clear(); // メモリ上限の安全弁
  return false;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AIサービスが設定されていません" }, { status: 503 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらくしてからお試しください。" }, { status: 429 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const messages = body.messages?.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
  );
  if (!messages?.length) {
    return NextResponse.json({ error: "メッセージが必要です" }, { status: 400 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "回答の生成に失敗しました" }, { status: 502 });
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return NextResponse.json({ error: "回答を取得できませんでした" }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
