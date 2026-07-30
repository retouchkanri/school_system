import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import type { AttendanceRecord, AttendanceStatus, Student } from "@/lib/types";

/** 月間出欠ビュー / CSV出力で共有するデータ取得・日付ユーティリティ */

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export const STATUS_ORDER: AttendanceStatus[] = ["present", "absent", "late", "early_leave"];

/** グリッド/CSVで使う1文字表記 */
export const STATUS_CHARS: Record<AttendanceStatus, string> = {
  present: "出",
  absent: "欠",
  late: "遅",
  early_leave: "早",
};

/** ?month=YYYY-MM を検証。不正/未指定なら当月を返す */
export function parseMonth(raw?: string): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw;
  return toDateInput().slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM と 日 から YYYY-MM-DD */
export function dayKey(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

/** 0=日 〜 6=土 */
export function weekdayIndex(month: string, day: number): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, day).getDay();
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月`;
}

export interface MonthlyRow {
  student: Student;
  /** 日 (1〜末日) → その日の出欠記録 */
  byDay: Map<number, AttendanceRecord>;
  counts: Record<AttendanceStatus, number>;
}

export interface MonthlyData {
  month: string;
  days: number;
  rows: MonthlyRow[];
  totals: Record<AttendanceStatus, number>;
}

function emptyCounts(): Record<AttendanceStatus, number> {
  return { present: 0, absent: 0, late: 0, early_leave: 0 };
}

/** 指定月の在籍生徒 × 日 の出欠マトリクスを組み立てる */
export async function fetchMonthlyAttendance(month: string): Promise<MonthlyData> {
  const days = daysInMonth(month);
  const db = adminDb();
  const [{ data: studentsData }, { data: recordsData }] = await Promise.all([
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db
      .from("attendance_records")
      .select("*")
      .gte("date", dayKey(month, 1))
      .lte("date", dayKey(month, days)),
  ]);

  const students = (studentsData ?? []) as Student[];
  const records = (recordsData ?? []) as AttendanceRecord[];

  const rows: MonthlyRow[] = students.map((s) => ({
    student: s,
    byDay: new Map<number, AttendanceRecord>(),
    counts: emptyCounts(),
  }));
  const rowMap = new Map<string, MonthlyRow>(rows.map((r) => [r.student.id, r]));

  const totals = emptyCounts();
  for (const r of records) {
    const row = rowMap.get(r.student_id);
    if (!row) continue; // 在籍中でない生徒の記録は表示対象外
    const day = Number(r.date.slice(8, 10));
    if (!Number.isFinite(day) || day < 1 || day > days) continue;
    row.byDay.set(day, r);
    row.counts[r.status]++;
    totals[r.status]++;
  }

  return { month, days, rows, totals };
}
