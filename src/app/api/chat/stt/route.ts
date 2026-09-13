import { NextResponse } from "next/server";

/**
 * OpenAI Whisper 文字起こしプロキシ。
 * ブラウザの SpeechRecognition が使えない／失敗したときのフォールバック。
 */

const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();
const MAX_BYTES = 8 * 1024 * 1024;

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

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AIサービスが設定されていません" }, { status: 503 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらくしてからお試しください。" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "音声ファイルが必要です" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "音声が長すぎます" }, { status: 413 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "speech.webm");
  upstream.append("model", "whisper-1");
  upstream.append("language", "ja");
  upstream.append("response_format", "json");

  const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!openaiRes.ok) {
    return NextResponse.json({ error: "音声の文字起こしに失敗しました" }, { status: 502 });
  }

  const data = (await openaiRes.json()) as { text?: string };
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "音声を認識できませんでした" }, { status: 422 });
  }

  return NextResponse.json({ text });
}
