import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, daysAgo } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import {
  Card,
  PageHeader,
  StatCard,
  EmptyState,
  Badge,
  Table,
  Td,
  SectionTitle,
  type BadgeTone,
} from "@/components/ui";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "green",
  absent: "red",
  late: "amber",
  early_leave: "blue",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function fmtDateWithWeekday(d: string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return fmtDate(d);
  return `${fmtDate(d)} (${WEEKDAYS[date.getDay()]})`;
}

export default async function StudentAttendancePage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="出欠履歴" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const since = toDateInput(daysAgo(30));
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await adminDb()
    .from("attendance_records")
    .select("*")
    .eq("student_id", student.id)
    .gte("date", since)
    .order("date", { ascending: false });

  const records = (data ?? []) as AttendanceRecord[];

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, early_leave: 0 };
  for (const r of records) {
    if (r.date >= monthStart) counts[r.status] += 1;
  }

  return (
    <div>
      <PageHeader title="出欠履歴" description="直近30日分の出欠記録を表示しています" />

      <SectionTitle>今月のサマリ</SectionTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="出席" value={counts.present} tone="success" />
        <StatCard label="欠席" value={counts.absent} tone="danger" />
        <StatCard label="遅刻" value={counts.late} tone="warning" />
        <StatCard label="早退" value={counts.early_leave} />
      </div>

      <SectionTitle>出欠記録(直近30日)</SectionTitle>
      {records.length === 0 ? (
        <Card>
          <EmptyState message="直近30日の出欠記録はありません" />
        </Card>
      ) : (
        <Table headers={["日付", "状態", "備考"]}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDateWithWeekday(r.date)}</Td>
              <Td>
                <Badge tone={ATTENDANCE_TONES[r.status]}>{ATTENDANCE_STATUS_LABELS[r.status]}</Badge>
              </Td>
              <Td className="text-gray-600">{r.note ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
