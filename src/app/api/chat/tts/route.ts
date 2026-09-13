import { NextResponse } from "next/server";

/**
 * OpenAI TTS プロキシ。
 * チャット返答を読み上げる用。音声は nova (澄んだ女性声) + tts-1-hd。
 * 日本語品質はネイティブTTSほどではないが、OpenAI TTS の中では比較的聞き取りやすい。
 */

const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();
const MAX_CHARS = 1200;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (bucket.length >= RATE_LIMIT) {
    rateBuckets.set(ip, bucket);
    return true;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  if (rateBuckets.size > 10_000) rateBuckets.clear();
  return false;
}

/** URL・Markdown・余分な記号を落として読み上げ向けの平文にする */
function toSpeakableText(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`#~>|[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
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

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? toSpeakableText(body.text) : "";
  if (!text) {
    return NextResponse.json({ error: "読み上げる文が必要です" }, { status: 400 });
  }

  const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: "nova",
      input: text,
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!openaiRes.ok || !openaiRes.body) {
    return NextResponse.json({ error: "音声の生成に失敗しました" }, { status: 502 });
  }

  return new NextResponse(openaiRes.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
