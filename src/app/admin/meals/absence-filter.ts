import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import type { MealRecord, Student } from "@/lib/types";

/**
 * 欠食アラートの算出ロジック。
 * ページ (page.tsx) と職員通知アクション (actions.ts) の双方から利用するため、
 * 食事管理ディレクトリ内の共有モジュールとして切り出している。
 *
 * 承認済みの外泊届 (parent_approval='approved') の期間中は寮で食事をとらないため、
 * その日の欠食はアラートの回数からは除外する。
 */

/** アラートの集計対象期間 (対象日を含む直近N日間) */
export const MEAL_ALERT_DAYS = 5;
/** アラート対象とする欠食回数の下限 */
export const MEAL_ALERT_THRESHOLD = 3;

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}

/** 対象日を含む直近 MEAL_ALERT_DAYS 日間の開始日 */
export function alertRangeStart(date: string): string {
  return addDays(date, -(MEAL_ALERT_DAYS - 1));
}

export interface OvernightRange {
  student_id: string;
  start_date: string;
  end_date: string;
}

export interface MealAlertEntry {
  student: Student;
  count: number;
}

export interface MealAlertResult {
  /** 集計期間の開始日 (YYYY-MM-DD) */
  from: string;
  /** 集計期間の終了日 = 対象日 (YYYY-MM-DD) */
  to: string;
  alerts: MealAlertEntry[];
}

/** 指定生徒がその日に承認済みの外泊期間中かどうか (YYYY-MM-DD の辞書順比較で判定) */
export function isOnOvernightLeave(studentId: string, date: string, ranges: OvernightRange[]): boolean {
  return ranges.some((r) => r.student_id === studentId && r.start_date <= date && date <= r.end_date);
}

/** 外泊中の欠食を除外したうえで、生徒ごとの欠食回数を数える */
export function countMissedMeals(missed: MealRecord[], ranges: OvernightRange[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of missed) {
    if (isOnOvernightLeave(m.student_id, m.date, ranges)) continue;
    counts.set(m.student_id, (counts.get(m.student_id) ?? 0) + 1);
  }
  return counts;
}

/** 欠食回数が閾値以上の在籍生徒を、回数の多い順に返す */
export function buildMealAlerts(
  students: Student[],
  missed: MealRecord[],
  ranges: OvernightRange[],
  threshold: number = MEAL_ALERT_THRESHOLD
): MealAlertEntry[] {
  const counts = countMissedMeals(missed, ranges);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  return [...counts.entries()]
    .filter(([, n]) => n >= threshold)
    .map(([id, n]) => ({ student: studentMap.get(id), count: n }))
    .filter((x): x is MealAlertEntry => x.student != null)
    .sort((a, b) => b.count - a.count || a.student.name.localeCompare(b.student.name, "ja"));
}

/** 承認済み外泊届のうち、指定期間と重なるものを取得する */
export async function fetchApprovedOvernightRanges(from: string, to: string): Promise<OvernightRange[]> {
  const { data } = await adminDb()
    .from("overnight_leave_requests")
    .select("student_id,start_date,end_date")
    .eq("parent_approval", "approved")
    .lte("start_date", to)
    .gte("end_date", from);
  return (data ?? []) as OvernightRange[];
}

/**
 * 指定日を末日とする直近5日間の欠食アラートを算出する (DBアクセス込み)。
 * 職員通知アクションから呼べるよう、ページ描画と同じ結果を返す。
 */
export async function fetchMealAlerts(date: string): Promise<MealAlertResult> {
  const from = alertRangeStart(date);
  const db = adminDb();
  const [{ data: studentsData }, { data: missedData }] = await Promise.all([
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db.from("meal_records").select("*").eq("eaten", false).gte("date", from).lte("date", date),
  ]);
  const ranges = await fetchApprovedOvernightRanges(from, date);
  return {
    from,
    to: date,
    alerts: buildMealAlerts((studentsData ?? []) as Student[], (missedData ?? []) as MealRecord[], ranges),
  };
}
