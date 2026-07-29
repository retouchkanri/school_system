import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Card, PageHeader, EmptyState, Badge, InfoRow, SectionTitle } from "@/components/ui";
import type { Horse, HorseMonthlySummary, Supporter } from "@/lib/types";

type SupporterWithHorse = Supporter & { horses: Horse | null };

export default async function SupporterHomePage() {
  const profile = await requireRole("supporter");

  const db = adminDb();
  const { data } = await db.from("supporters").select("*, horses(*)").eq("user_id", profile.id);
  const supports = ((data ?? []) as unknown as SupporterWithHorse[]).filter((s) => s.horses !== null);

  if (supports.length === 0) {
    return (
      <div>
        <PageHeader title="月次報告" description="一口支援者ポータル" />
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-gray-700">支援馬が登録されていません</p>
            <p className="mt-2 text-sm text-gray-500">
              ご支援の登録状況については、学院までお問い合わせください。
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const horseIds = supports.map((s) => s.horse_id);
  const { data: summaryData } = await db
    .from("horse_monthly_summaries")
    .select("*")
    .in("horse_id", horseIds)
    .eq("shared", true)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  const summaries = (summaryData ?? []) as HorseMonthlySummary[];

  return (
    <div>
      <PageHeader
        title="月次報告"
        description={`${profile.full_name} 様、いつもご支援ありがとうございます`}
      />

      <div className="space-y-8">
        {supports.map((support) => {
          const horse = support.horses as Horse;
          const horseSummaries = summaries.filter((s) => s.horse_id === support.horse_id);
          return (
            <div key={support.id}>
              <Card title="ご支援いただいている馬">
                <div className="flex flex-col gap-6 sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={horse.photo_url ?? "/images/horse-1.jpg"}
                    alt={horse.name}
                    className="h-40 w-full shrink-0 self-center rounded-2xl object-cover sm:h-36 sm:w-52 sm:self-start"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{horse.name}</h2>
                      {horse.is_retouch && <Badge tone="brand">リタッチ馬</Badge>}
                    </div>
                    <dl className="mt-2">
                      <InfoRow label="品種" value={horse.breed ?? "—"} />
                      <InfoRow label="年齢" value={horse.age != null ? `${horse.age}歳` : "—"} />
                      <InfoRow label="馬房" value={horse.stall ?? "—"} />
                      <InfoRow label="ご支援開始" value={fmtDate(support.since)} />
                    </dl>
                    {horse.notes && (
                      <p className="mt-3 whitespace-pre-wrap bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
                        {horse.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              <SectionTitle>{horse.name} の月次報告</SectionTitle>
              {horseSummaries.length === 0 ? (
                <Card>
                  <EmptyState message="共有された月次報告はまだありません。報告が届くまで今しばらくお待ちください。" />
                </Card>
              ) : (
                <div className="space-y-4">
                  {horseSummaries.map((s) => (
                    <Card
                      key={s.id}
                      title={`${s.year}年${s.month}月のご報告`}
                      action={<Badge tone="blue">騎乗報告 {s.report_count} 件</Badge>}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{s.summary}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
