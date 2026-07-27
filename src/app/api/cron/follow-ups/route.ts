import { NextResponse } from "next/server";
import { runAutomaticFollowUps } from "@/lib/follow-ups";

/**
 * フォロー自動送信の定期実行エンドポイント (Vercel Cron から呼ばれる)。
 *
 * 自動送信が有効なルールについて、条件に該当し・待機日数を満たし・まだ送っていない
 * 見込み客へフォローのメール/LINEを送信する。
 * 送信済み判定は follow_up_logs で行うため、多重実行されても二重送信にはならない。
 *
 * 認証: CRON_SECRET を設定し、`Authorization: Bearer <CRON_SECRET>` を要求する。
 * (Vercel Cron は自動でこのヘッダーを付与する。未設定時は 404 = 既定で無効・安全)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not found" }, { status: 404 });

  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const ok = auth === `Bearer ${secret}` || url.searchParams.get("key") === secret;
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const results = await runAutomaticFollowUps();
  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    totalSent,
    results, // ルールごとの { enabled, matched (送信対象件数), sent (実送信件数) }
  });
}
