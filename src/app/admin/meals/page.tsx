import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput, fmtDate } from "@/lib/format";
import { MEAL_LABELS } from "@/lib/constants";
import { PageHeader, Card, Table, Td, EmptyState, btnSecondary, btnSmall } from "@/components/ui";
import type { Student, MealRecord, MealType } from "@/lib/types";
import MealToggle from "./meal-toggle";
import MealNoteForm from "./meal-note-form";
import BulkMealButton from "./bulk-meal-button";
import MealAlertNotifyButton from "./meal-alert-notify-button";
import {
  addDays,
  alertRangeStart,
  buildMealAlerts,
  fetchApprovedOvernightRanges,
  MEAL_ALERT_DAYS,
  MEAL_ALERT_THRESHOLD,
} from "./absence-filter";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toDateInput();
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
  const alertFrom = alertRangeStart(date);

  const db = adminDb();
  const [{ data: studentsData }, { data: recordsData }, { data: missedData }, overnightRanges] = await Promise.all([
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db.from("meal_records").select("*").eq("date", date),
    db.from("meal_records").select("*").eq("eaten", false).gte("date", alertFrom).lte("date", date),
    fetchApprovedOvernightRanges(alertFrom, date),
  ]);

  const students = (studentsData ?? []) as Student[];
  const records = (recordsData ?? []) as MealRecord[];
  const missed = (missedData ?? []) as MealRecord[];

  const recordMap = new Map<string, MealRecord>();
  for (const r of records) recordMap.set(`${r.student_id}_${r.meal}`, r);

  // 直近5日で欠食(eaten=false)が3回以上の生徒。承認済み外泊期間中の欠食はカウントしない。
  const alertStudents = buildMealAlerts(students, missed, overnightRanges);

  // 食事ごとの未登録人数 (一括登録ボタン用)
  const unrecordedByMeal = new Map<MealType, number>(
    MEAL_ORDER.map((m): [MealType, number] => [
      m,
      students.filter((s) => !recordMap.has(`${s.id}_${m}`)).length,
    ])
  );

  const eatenCount = records.filter((r) => r.eaten).length;
  const missedTodayCount = records.filter((r) => !r.eaten).length;

  return (
    <div>
      <PageHeader
        title="食事管理"
        description="生徒ごとの喫食状況 (朝・昼・夕) を記録します"
        action={
          <div className="flex items-center gap-2">
            <Link href={`/admin/meals?date=${addDays(date, -1)}`} className={btnSmall}>
              ← 前日
            </Link>
            <form method="get" className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button type="submit" className={btnSecondary}>
                表示
              </button>
            </form>
            <Link href={`/admin/meals?date=${addDays(date, 1)}`} className={btnSmall}>
              翌日 →
            </Link>
          </div>
        }
      />

      <p className="mb-4 text-sm font-semibold text-gray-700">
       {date.replace(/-/g, "/")} ({weekday}) の食事
        <span className="ml-3 text-xs font-medium text-gray-400">
          喫食 {eatenCount}件 / 欠食 {missedTodayCount}件
        </span>
      </p>

      {alertStudents.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-red-700">
           欠食が続いている生徒 ({fmtDate(alertFrom)} 〜 {fmtDate(date)} の{MEAL_ALERT_DAYS}日間で
            {MEAL_ALERT_THRESHOLD}回以上)
            <span className="ml-2 text-xs font-semibold text-red-500">(外泊中の欠食を除く)</span>
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {alertStudents.map(({ student, count }) => (
              <li key={student.id}>
                <Link
                  href={`/admin/students/${student.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  {student.name}
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">欠食 {count}回</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-500">
            体調不良や生活リズムの乱れの可能性があります。面談などのフォローを検討してください。
            承認済みの外泊届の期間中の欠食は回数から除外しています。
          </p>
          <MealAlertNotifyButton date={date} count={alertStudents.length} />
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState message="在籍中の生徒がいません" />
      ) : (
        <Card
          title="喫食グリッド (○=食べた / ×=食べない / —=未登録、クリックで切替)"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400">未登録を一括登録:</span>
              {MEAL_ORDER.map((m) => (
                <BulkMealButton
                  key={m}
                  date={date}
                  meal={m}
                  mealLabel={MEAL_LABELS[m]}
                  unrecorded={unrecordedByMeal.get(m) ?? 0}
                />
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table headers={["生徒", ...MEAL_ORDER.map((m) => MEAL_LABELS[m])]}>
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <Td>
                    <Link href={`/admin/students/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                      {s.name}
                    </Link>
                    <span className="ml-2 font-mono text-[11px] text-gray-400">{s.student_number}</span>
                  </Td>
                  {MEAL_ORDER.map((m) => {
                    const record = recordMap.get(`${s.id}_${m}`);
                    return (
                      <Td key={m}>
                        <div className="inline-flex flex-col items-center">
                          <MealToggle studentId={s.id} date={date} meal={m} eaten={record?.eaten ?? null} />
                          {record && (record.eaten === false || !!record.note) && (
                            <MealNoteForm
                              studentId={s.id}
                              date={date}
                              meal={m}
                              note={record.note}
                              eaten={record.eaten}
                            />
                          )}
                        </div>
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-gray-400">
        ※ 「×(欠食)」にすると理由を入力できます。入力した理由は生徒・保護者の食事記録画面にも表示されます。
      </p>
    </div>
  );
}
