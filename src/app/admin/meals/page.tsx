import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput, fmtDate } from "@/lib/format";
import { MEAL_LABELS } from "@/lib/constants";
import { PageHeader, Card, Table, Td, EmptyState, btnSecondary, btnSmall } from "@/components/ui";
import type { Student, MealRecord, MealType } from "@/lib/types";
import MealToggle from "./meal-toggle";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toDateInput();
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
  const alertFrom = addDays(date, -4);

  const db = adminDb();
  const [{ data: studentsData }, { data: recordsData }, { data: missedData }] = await Promise.all([
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db.from("meal_records").select("*").eq("date", date),
    db.from("meal_records").select("*").eq("eaten", false).gte("date", alertFrom).lte("date", date),
  ]);

  const students = (studentsData ?? []) as Student[];
  const records = (recordsData ?? []) as MealRecord[];
  const missed = (missedData ?? []) as MealRecord[];

  const recordMap = new Map<string, boolean>();
  for (const r of records) recordMap.set(`${r.student_id}_${r.meal}`, r.eaten);

  // 直近5日で欠食(eaten=false)が3回以上の生徒
  const missCount = new Map<string, number>();
  for (const m of missed) missCount.set(m.student_id, (missCount.get(m.student_id) ?? 0) + 1);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const alertStudents = [...missCount.entries()]
    .filter(([, n]) => n >= 3)
    .map(([id, n]) => ({ student: studentMap.get(id), count: n }))
    .filter((x): x is { student: Student; count: number } => x.student != null)
    .sort((a, b) => b.count - a.count);

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
        📅 {date.replace(/-/g, "/")} ({weekday}) の食事
        <span className="ml-3 text-xs font-medium text-gray-400">
          喫食 {eatenCount}件 / 欠食 {missedTodayCount}件
        </span>
      </p>

      {alertStudents.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-red-700">⚠️ 欠食が続いている生徒 ({fmtDate(alertFrom)} 〜 {fmtDate(date)} の5日間で3回以上)</h3>
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
          <p className="mt-2 text-xs text-red-500">体調不良や生活リズムの乱れの可能性があります。面談などのフォローを検討してください。</p>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState message="在籍中の生徒がいません" />
      ) : (
        <Card title="喫食グリッド (○=食べた / ×=食べない / —=未登録、クリックで切替)">
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
                  {MEAL_ORDER.map((m) => (
                    <Td key={m}>
                      <MealToggle
                        studentId={s.id}
                        date={date}
                        meal={m}
                        eaten={recordMap.get(`${s.id}_${m}`) ?? null}
                      />
                    </Td>
                  ))}
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
