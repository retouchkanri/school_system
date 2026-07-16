import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { Horse, HorseMonthlySummary, Supporter } from "@/lib/types";
import { GenerateSummaryForm, ShareForm } from "./retouch-forms";

export default async function AdminRetouchPage() {
  await requireRole("admin");
  const db = adminDb();

  const { data: horsesData } = await db.from("horses").select("*").eq("is_retouch", true).order("name");
  const horses = (horsesData ?? []) as Horse[];
  const horseIds = horses.map((h) => h.id);

  let supporters: Supporter[] = [];
  let summaries: HorseMonthlySummary[] = [];
  if (horseIds.length > 0) {
    const [supRes, sumRes] = await Promise.all([
      db.from("supporters").select("*").in("horse_id", horseIds).order("name"),
      db
        .from("horse_monthly_summaries")
        .select("*")
        .in("horse_id", horseIds)
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
    ]);
    supporters = (supRes.data ?? []) as Supporter[];
    summaries = (sumRes.data ?? []) as HorseMonthlySummary[];
  }

  return (
    <div>
      <PageHeader
        title="リタッチ馬 月次報告"
        description="リタッチ馬(引退馬支援)の騎乗報告をAIが月次要約し、一口支援者へ共有します"
      />

      {horses.length === 0 ? (
        <EmptyState message="リタッチ馬が登録されていません。馬管理からリタッチ馬を設定してください。" />
      ) : (
        <div className="space-y-6">
          {horses.map((h) => {
            const horseSupporters = supporters.filter((s) => s.horse_id === h.id);
            const horseSummaries = summaries.filter((s) => s.horse_id === h.id);
            return (
              <Card key={h.id} title={`${h.name}号`} action={<GenerateSummaryForm horseId={h.id} />}>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    一口支援者({horseSupporters.length}名)
                  </p>
                  {horseSupporters.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {horseSupporters.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                        >
                          {s.name}
                          {s.since && <span className="text-[10px] text-purple-400">({fmtDate(s.since)}〜)</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">支援者はまだいません</p>
                  )}
                </div>

                <p className="mb-2 text-xs font-semibold text-gray-500">月次要約</p>
                {horseSummaries.length === 0 ? (
                  <EmptyState message="まだ月次要約がありません。右上の「今月の要約を生成」から作成できます。" />
                ) : (
                  <div className="space-y-3">
                    {horseSummaries.map((s) => (
                      <div key={s.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">
                            {s.year}年{s.month}月
                          </p>
                          {s.shared ? <Badge tone="green">共有済</Badge> : <Badge tone="gray">未共有</Badge>}
                          <span className="text-xs text-gray-400">
                            報告 {s.report_count}件 ・ 生成日 {fmtDate(s.created_at)}
                          </span>
                          <div className="ml-auto">
                            <ShareForm summaryId={s.id} shared={s.shared} />
                          </div>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{s.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        ※ 共有すると支援者へメール・LINEで自動送信されます。送信結果は
        <Link href="/admin/notifications" className="mx-1 font-semibold text-brand-600 hover:underline">
          送信ログ
        </Link>
        で確認できます。
      </p>
    </div>
  );
}
