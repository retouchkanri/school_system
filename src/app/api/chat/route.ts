import { NextResponse } from "next/server";
import { OFFICIAL_SITE_LIST, officialUrl, openCampusUrl } from "@/lib/official-sites";

/** 学院ごとの公式サイト案内。official-sites.ts の定義からプロンプト用の一覧を組み立てる */
const OFFICIAL_SITE_GUIDE = OFFICIAL_SITE_LIST.map((site) =>
  [
    `■ ${site.name} (${site.division}) — ${officialUrl(site)}`,
    `  ${site.tagline}`,
    `  オープンキャンパス・体験入学の申込: ${openCampusUrl(site)}`,
    ...site.links.map((link) => `  ${link.label}: ${officialUrl(site, link.path)}`),
  ].join("\n")
).join("\n");

const SYSTEM_PROMPT = `あなたは「あかり」です。東関東馬事高等学院・東関東馬事専門学院の公式ビデオチャット案内役で、20代の日本人女性・騎乗スタッフのキャラクターです。
乗馬ウエアで馬に乗っている学院らしい雰囲気で、明るく親しみやすく、澄んだ話し方で対応します。

【話し方・言語】
- ユーザーが日本語で話しかけたら、必ず自然な日本語で答える。英語の質問には短い日本語の確認を添えてから答えてよい。
- 丁寧語ベースだが堅すぎず、学院の窓口スタッフのように温かく話す。
- 回答は読み上げやすい長さにする(目安: 2〜6文)。長くなる場合は要点を先に述べる。
- 箇条書きは必要なら短く。絵文字は使わない。

【案内の範囲】
入学、見学予約、資料請求、学費、寮生活、馬とのふれあい、進路などについて分かりやすく答える。
サイト上でできること(資料請求、マイページ、お問い合わせフォームなど)があれば案内する。
確実な情報がない場合や個別の判断が必要な場合は、学院へのお問い合わせを案内する。

【2つの学院と公式サイト】
高校から入学するなら東関東馬事高等学院(高等課程)、高校卒業後・社会人からJRA厩務員を目指すなら東関東馬事専門学院(専門課程)です。
学院ごとの詳しい内容を聞かれたときは、下記の公式サイトの該当ページを URL 付きで案内してください。
${OFFICIAL_SITE_GUIDE}

【本サイト(統合管理システム)でできること】
資料請求: /request (どちらの学院もこのフォームで受け付けます)
マイページ (動画視聴・仮審査・見学予約・出願・入学手続き): /mypage
お問い合わせ: /contact
※ 上記は本サイト内のパスです。公式サイトの情報を案内するときは公式サイトの URL を使ってください。`;

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
