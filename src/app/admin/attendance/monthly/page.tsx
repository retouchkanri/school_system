import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import { PageHeader, Card, StatCard, EmptyState, btnSecondary, btnSmall } from "@/components/ui";
import type { AttendanceStatus } from "@/lib/types";
import {
  WEEKDAYS,
  STATUS_CHARS,
  STATUS_ORDER,
  parseMonth,
  addMonths,
  dayKey,
  weekdayIndex,
  monthLabel,
  fetchMonthlyAttendance,
} from "./data";

const CELL_TONES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  early_leave: "bg-blue-100 text-blue-700",
};

const COUNT_TONES: Record<AttendanceStatus, string> = {
  present: "text-emerald-700",
  absent: "text-red-700",
  late: "text-amber-700",
  early_leave: "text-blue-700",
};

export default async function MonthlyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const month = parseMonth(sp.month);
  const { days, rows, totals } = await fetchMonthlyAttendance(month);
  const dayList = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title="月間出欠表"
        description="在籍生徒の1か月分の出欠を一覧で確認します"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/attendance/monthly?month=${addMonths(month, -1)}`} className={btnSmall}>
              ← 前月
            </Link>
            <form method="get" className="flex items-center gap-2">
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button type="submit" className={btnSecondary}>
                表示
              </button>
            </form>
            <Link href={`/admin/attendance/monthly?month=${addMonths(month, 1)}`} className={btnSmall}>
              翌月 →
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-gray-700">{monthLabel(month)} の出欠</p>
        <Link href={`/admin/attendance?date=${dayKey(month, 1)}`} className={btnSmall}>
          日次出欠登録へ
        </Link>
        <a href={`/admin/attendance/monthly/export?month=${month}`} className={btnSmall}>
         CSVダウンロード
        </a>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="延べ出席" value={totals.present} tone="success" sub={`在籍${rows.length}名`} />
        <StatCard label="延べ欠席" value={totals.absent} tone="danger" />
        <StatCard label="延べ遅刻" value={totals.late} tone="warning" />
        <StatCard label="延べ早退" value={totals.early_leave} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="在籍中の生徒がいません" />
      ) : (
        <Card title="月間グリッド (出=出席 / 欠=欠席 / 遅=遅刻 / 早=早退 / ・=未登録)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500">
                    生徒
                  </th>
                  {dayList.map((d) => {
                    const w = weekdayIndex(month, d);
                    const tone = w === 0 ? "text-red-500" : w === 6 ? "text-blue-500" : "text-gray-500";
                    return (
                      <th key={d} className={`px-1 py-2 text-center text-[11px] font-bold ${tone}`}>
                        <span className="block">{d}</span>
                        <span className="block text-[10px] font-medium">{WEEKDAYS[w]}</span>
                      </th>
                    );
                  })}
                  {STATUS_ORDER.map((s) => (
                    <th key={s} className="border-l border-gray-200 px-2 py-2 text-center text-[11px] font-bold text-gray-500">
                      {/* 集計列: 出/欠/遅/早 */}
                      {STATUS_CHARS[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.student.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2">
                      <Link
                        href={`/admin/students/${row.student.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {row.student.name}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-gray-400">{row.student.student_number}</span>
                    </td>
                    {dayList.map((d) => {
                      const rec = row.byDay.get(d) ?? null;
                      const w = weekdayIndex(month, d);
                      const [, mm] = month.split("-");
                      const title = rec
                        ? `${Number(mm)}/${d}(${WEEKDAYS[w]}) ${ATTENDANCE_STATUS_LABELS[rec.status]}${rec.note ? ` ${rec.note}` : ""}`
                        : `${Number(mm)}/${d}(${WEEKDAYS[w]}) 未登録`;
                      return (
                        <td key={d} className="px-0.5 py-1 text-center">
                          <span
                            title={title}
                            className={`inline-flex h-6 w-6 items-center justify-center text-[11px] font-bold ${
                              rec ? CELL_TONES[rec.status] : "text-gray-300"
                            }`}
                          >
                            {rec ? STATUS_CHARS[rec.status] : "・"}
                          </span>
                        </td>
                      );
                    })}
                    {STATUS_ORDER.map((s) => (
                      <td
                        key={s}
                        className={`border-l border-gray-200 px-2 py-2 text-center text-xs font-bold ${
                          row.counts[s] > 0 ? COUNT_TONES[s] : "text-gray-300"
                        }`}
                      >
                        {row.counts[s]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
