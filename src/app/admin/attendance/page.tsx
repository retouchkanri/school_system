import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, ABSENCE_REQUEST_STATUS_LABELS } from "@/lib/constants";
import {
  PageHeader, StatCard, Table, Td, Badge, EmptyState, btnSecondary, btnSmall, type BadgeTone,
} from "@/components/ui";
import type { Student, AttendanceRecord, AttendanceStatus, AbsenceRequest } from "@/lib/types";
import AttendanceForm from "./attendance-form";
import BulkPresentButton from "./bulk-present-button";

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "green",
  absent: "red",
  late: "amber",
  early_leave: "blue",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateInput(d);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toDateInput();
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];

  const db = adminDb();
  const [{ data: studentsData }, { data: recordsData }, { data: absencesData }] = await Promise.all([
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db.from("attendance_records").select("*").eq("date", date),
    // 事前連絡 (欠席・遅刻・早退の届出)。テーブル未作成の環境ではエラーになるが data=null で安全に無視される
    db.from("absence_requests").select("*").eq("date", date),
  ]);

  const students = (studentsData ?? []) as Student[];
  const records = (recordsData ?? []) as AttendanceRecord[];
  const absences = (absencesData ?? []) as AbsenceRequest[];
  const recordMap = new Map<string, AttendanceRecord>(records.map((r) => [r.student_id, r]));
  // 同一生徒・同一日に複数件ある場合は却下されていないものを優先
  const absenceMap = new Map<string, AbsenceRequest>();
  for (const a of absences) {
    const prev = absenceMap.get(a.student_id);
    if (!prev || (prev.status === "rejected" && a.status !== "rejected")) absenceMap.set(a.student_id, a);
  }

  const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
  const unrecorded = students.filter((s) => !recordMap.has(s.id)).length;

  return (
    <div>
      <PageHeader
        title="日次出欠登録"
        description="生徒ごとに出席・欠席・遅刻・早退を登録します"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/attendance?date=${addDays(date, -1)}`} className={btnSmall}>
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
            <Link href={`/admin/attendance?date=${addDays(date, 1)}`} className={btnSmall}>
              翌日 →
            </Link>
            <Link href={`/admin/attendance/monthly?month=${date.slice(0, 7)}`} className={btnSmall}>
              月間出欠表 →
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold text-gray-700">
         {date.replace(/-/g, "/")} ({weekday}) の出欠
          {unrecorded > 0 && <span className="ml-2 text-xs font-medium text-gray-400">未登録 {unrecorded}名</span>}
        </p>
        <BulkPresentButton date={date} unrecorded={unrecorded} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="出席" value={count("present")} tone="success" sub={`全${students.length}名中`} />
        <StatCard label="欠席" value={count("absent")} tone="danger" />
        <StatCard label="遅刻" value={count("late")} tone="warning" />
        <StatCard label="早退" value={count("early_leave")} />
      </div>

      {students.length === 0 ? (
        <EmptyState message="在籍中の生徒がいません" />
      ) : (
        <Table headers={["氏名", "クラス", "状態", "出欠登録・備考"]}>
          {students.map((s) => {
            const rec = recordMap.get(s.id) ?? null;
            const absence = absenceMap.get(s.id) ?? null;
            return (
              <tr key={s.id} className="hover:bg-gray-50">
                <Td>
                  <Link href={`/admin/students/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                  <span className="ml-2 font-mono text-[11px] text-gray-400">{s.student_number}</span>
                </Td>
                <Td className="text-gray-600">{s.class_name ?? "—"}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {rec ? (
                      <Badge tone={ATTENDANCE_TONES[rec.status]}>{ATTENDANCE_STATUS_LABELS[rec.status]}</Badge>
                    ) : (
                      <Badge tone="gray">未登録</Badge>
                    )}
                    {absence && (
                      <Link
                        href="/admin/absences"
                        title={`事前連絡: ${ATTENDANCE_STATUS_LABELS[absence.kind]} / ${ABSENCE_REQUEST_STATUS_LABELS[absence.status]} / 理由: ${absence.reason}`}
                        className="hover:underline"
                      >
                        <Badge tone="amber">連絡あり ({ATTENDANCE_STATUS_LABELS[absence.kind]})</Badge>
                      </Link>
                    )}
                  </div>
                </Td>
                <Td>
                  <AttendanceForm
                    studentId={s.id}
                    date={date}
                    current={rec?.status ?? null}
                    note={rec?.note ?? null}
                  />
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
