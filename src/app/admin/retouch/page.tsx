import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { RIDEABILITY_LABELS } from "@/lib/constants";
import { computeHorseMonthMaterials, type ReportForSummary } from "@/lib/ai";
import type { Horse, HorseMonthlySummary, Supporter } from "@/lib/types";
import { GenerateSummaryForm, ShareForm, EditSummaryForm } from "./retouch-forms";

/** 騎乗報告 + 生徒名 (要約の材料表示に使う) */
interface MonthReportRow {
  horse_id: string;
  report_date: string;
  content: string;
  horse_condition: string | null;
  rideability: number | null;
  horse_mood: string | null;
  incident: string | null;
  fell_off: boolean;
  students: { name: string } | null;
}

/** 指定年月の初日・末日 (actions.ts の生成対象期間と同じ計算) */
function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

function toReportForSummary(r: MonthReportRow): ReportForSummary {
  return {
    report_date: r.report_date,
    content: r.content,
    horse_condition: r.horse_condition,
    student_name: r.students?.name,
    rideability: r.rideability,
    horse_mood: r.horse_mood,
    incident: r.incident,
    fell_off: r.fell_off ?? false,
  };
}

/**
 * 要約を生成する前に「その月にどんな材料があるか」を職員が確認するためのパネル。
 * 件数・乗りやすさ平均・参加生徒数に加え、生成に使う元データ(日付・生徒名・内容)を折りたたみで確認できる。
 */
function MaterialsPanel({
  label,
  year,
  month,
  reports,
}: {
  label: string;
  year: number;
  month: number;
  reports: MonthReportRow[];
}) {
  const m = computeHorseMonthMaterials(reports.map(toReportForSummary));

  return (
    <div className="border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-xs font-bold text-gray-700">
          {label}({year}年{month}月)
        </span>
        <span className="text-xs text-gray-500">
          騎乗報告 <b className="text-sm text-gray-900">{m.reportCount}</b> 件
        </span>
        <span className="text-xs text-gray-500">
          乗りやすさ平均{" "}
          <b className="text-sm text-gray-900">{m.rideabilityAvg !== null ? m.rideabilityAvg.toFixed(1) : "—"}</b>
          {m.rideabilityAvg !== null && <span className="text-gray-400"> /5({m.rideabilityCount}件回答)</span>}
        </span>
        <span className="text-xs text-gray-500">
          参加した生徒 <b className="text-sm text-gray-900">{m.studentCount}</b> 名
        </span>
      </div>

      {m.moodBreakdown.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.moodBreakdown.map((b) => (
            <span
              key={b.mood}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
            >
              {b.mood} {b.count}件
            </span>
          ))}
        </div>
      )}

      {(m.fellOffCount > 0 || m.incidentCount > 0) && (
        <p className="mt-2 border-l-2 border-amber-300 bg-amber-50/60 px-2 py-1 text-[11px] leading-relaxed text-amber-800">
          内部記録: 落馬 {m.fellOffCount}件 / ヒヤリハット {m.incidentCount}件。
          支援者向けレポートには不安を与える表現では書かれませんが、事実に反する内容になっていないか職員が必ずご確認ください。
        </p>
      )}

      {reports.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-brand-600 hover:underline">
            生成に使う元データを確認({reports.length}件)
          </summary>
          <div className="mt-2 space-y-2">
            {reports.map((r, i) => (
              <div key={`${r.report_date}-${i}`} className="border-l-2 border-gray-200 pl-2">
                <p className="text-[11px] text-gray-500">
                  {fmtDate(r.report_date)} ・ {r.students?.name ?? "生徒不明"}
                  {r.rideability !== null &&
                    ` ・ 乗りやすさ ${r.rideability}(${RIDEABILITY_LABELS[r.rideability] ?? "—"})`}
                  {r.horse_mood && ` ・ ${r.horse_mood}`}
                  {r.fell_off && " ・ 落馬あり"}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{r.content}</p>
                {r.horse_condition && <p className="text-[11px] text-gray-500">馬の状態: {r.horse_condition}</p>}
                {r.incident && <p className="text-[11px] text-amber-700">ヒヤリハット: {r.incident}</p>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default async function AdminRetouchPage() {
  await requireRole("admin");
  const db = adminDb();

  const { data: horsesData } = await db.from("horses").select("*").eq("is_retouch", true).order("name");
  const horses = (horsesData ?? []) as Horse[];
  const horseIds = horses.map((h) => h.id);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prevBase = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prevBase.getFullYear();
  const prevMonth = prevBase.getMonth() + 1;
  const currentRange = monthRange(currentYear, currentMonth);
  const prevRange = monthRange(prevYear, prevMonth);

  let supporters: Supporter[] = [];
  let summaries: HorseMonthlySummary[] = [];
  let monthReports: MonthReportRow[] = [];
  if (horseIds.length > 0) {
    const [supRes, sumRes, repRes] = await Promise.all([
      db.from("supporters").select("*").in("horse_id", horseIds).order("name"),
      db
        .from("horse_monthly_summaries")
        .select("*")
        .in("horse_id", horseIds)
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
      db
        .from("riding_reports")
        .select(
          "horse_id, report_date, content, horse_condition, rideability, horse_mood, incident, fell_off, students(name)"
        )
        .in("horse_id", horseIds)
        .gte("report_date", prevRange.start)
        .lte("report_date", currentRange.end)
        .order("report_date"),
    ]);
    supporters = (supRes.data ?? []) as Supporter[];
    summaries = (sumRes.data ?? []) as HorseMonthlySummary[];
    monthReports = (repRes.data ?? []) as unknown as MonthReportRow[];
  }

  return (
    <div>
      <PageHeader
        title="リタッチ馬 月次報告"
        description="騎乗報告に寄せられた生徒たちの声(乗りやすさ・馬の様子・コメント)をAIが月次要約し、職員が確認・編集したうえで一口支援者へ共有します"
      />

      {horses.length === 0 ? (
        <EmptyState message="リタッチ馬が登録されていません。馬管理からリタッチ馬を設定してください。" />
      ) : (
        <div className="space-y-6">
          {horses.map((h) => {
            const horseSupporters = supporters.filter((s) => s.horse_id === h.id);
            const horseSummaries = summaries.filter((s) => s.horse_id === h.id);
            const horseReports = monthReports.filter((r) => r.horse_id === h.id);
            const currentReports = horseReports.filter(
              (r) => r.report_date >= currentRange.start && r.report_date <= currentRange.end
            );
            const prevReports = horseReports.filter(
              (r) => r.report_date >= prevRange.start && r.report_date <= prevRange.end
            );
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

                <p className="mb-2 text-xs font-semibold text-gray-500">要約の材料(生成前の確認用)</p>
                <div className="mb-4 space-y-2 bg-gray-50/50 p-2">
                  <MaterialsPanel label="今月" year={currentYear} month={currentMonth} reports={currentReports} />
                  <MaterialsPanel label="先月" year={prevYear} month={prevMonth} reports={prevReports} />
                </div>

                <p className="mb-2 text-xs font-semibold text-gray-500">月次要約</p>
                {horseSummaries.length === 0 ? (
                  <EmptyState message="まだ月次要約がありません。右上の「今月の要約を生成」から作成できます。" />
                ) : (
                  <div className="space-y-3">
                    {horseSummaries.map((s) => (
                      <div key={s.id} className="border border-gray-200 bg-gray-50/50 p-4">
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
                        <EditSummaryForm summaryId={s.id} summary={s.summary} shared={s.shared} />
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
        ※ 生徒の氏名は支援者向けレポートには出力されません(「生徒たち」として匿名化されます)。共有すると支援者へメール・LINEで自動送信されます。送信結果は
        <Link href="/admin/notifications" className="mx-1 font-semibold text-brand-600 hover:underline">
          送信ログ
        </Link>
        で確認できます。
      </p>
    </div>
  );
}
