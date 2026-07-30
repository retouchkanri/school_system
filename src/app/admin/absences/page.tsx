import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { ABSENCE_REQUEST_STATUS_LABELS, ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import {
  PageHeader, StatCard, Table, Td, Badge, EmptyState, type BadgeTone,
} from "@/components/ui";
import type {
  AbsenceRequest, AbsenceRequestStatus, AttendanceRecord, AttendanceStatus, Student,
} from "@/lib/types";
import HandleForm from "./handle-form";

const STATUS_TONES: Record<AbsenceRequestStatus, BadgeTone> = {
  pending: "amber",
  acknowledged: "green",
  rejected: "red",
};

const KIND_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "green",
  absent: "red",
  late: "amber",
  early_leave: "blue",
};

type AbsenceRow = AbsenceRequest & {
  student: Pick<Student, "id" | "name" | "student_number"> | null;
};

function submitterLabel(role: string | null): string {
  return role === "parent" ? "保護者" : role === "student" ? "本人" : "—";
}

export default async function AdminAbsencesPage() {
  await requireRole("admin");

  const db = adminDb();
  const { data } = await db
    .from("absence_requests")
    .select("*, student:students(id, name, student_number)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as AbsenceRow[];

  // 未処理の連絡について、同じ生徒・同じ日付の出欠記録が既にあるかを調べる。
  // 「出欠記録にも反映する」で既存の記録を意図せず上書きしないよう、受理フォームで警告するために使う。
  const pending = requests.filter((r) => r.status === "pending");
  const existingAttendance = new Map<string, AttendanceStatus>();
  if (pending.length > 0) {
    const { data: attData } = await db
      .from("attendance_records")
      .select("student_id, date, status")
      .in("student_id", [...new Set(pending.map((r) => r.student_id))])
      .in("date", [...new Set(pending.map((r) => r.date))]);
    for (const rec of (attData ?? []) as Pick<AttendanceRecord, "student_id" | "date" | "status">[]) {
      existingAttendance.set(`${rec.student_id}|${rec.date}`, rec.status);
    }
  }

  const today = toDateInput();
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const upcomingCount = requests.filter((r) => r.date >= today).length;
  const acknowledgedCount = requests.filter((r) => r.status === "acknowledged").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div>
      <PageHeader title="欠席・遅刻の連絡" description="生徒・保護者から届いた欠席・遅刻・早退の事前連絡を確認します" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="未確認" value={pendingCount} tone={pendingCount > 0 ? "danger" : "default"} />
        <StatCard label="本日以降の予定" value={upcomingCount} tone="warning" />
        <StatCard label="受理済" value={acknowledgedCount} tone="success" />
        <StatCard label="却下" value={rejectedCount} />
      </div>

      {requests.length === 0 ? (
        <EmptyState message="欠席・遅刻の連絡はまだありません" />
      ) : (
        <Table headers={["日付", "生徒", "区分", "理由", "補足", "提出者", "状態", "職員コメント", "操作"]}>
          {requests.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDate(r.date)}</Td>
              <Td className="whitespace-nowrap">
                {r.student ? (
                  <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {r.student.name}
                  </Link>
                ) : (
                  "—"
                )}
                {r.student && (
                  <span className="ml-2 font-mono text-[11px] text-gray-400">{r.student.student_number}</span>
                )}
              </Td>
              <Td>
                <Badge tone={KIND_TONES[r.kind]}>{ATTENDANCE_STATUS_LABELS[r.kind]}</Badge>
              </Td>
              <Td className="max-w-48">
                <p className="line-clamp-2 text-gray-800" title={r.reason}>
                  {r.reason}
                </p>
              </Td>
              <Td className="max-w-48">
                {r.detail ? (
                  <p className="line-clamp-2 text-gray-600" title={r.detail}>
                    {r.detail}
                  </p>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
              <Td className="whitespace-nowrap text-gray-600">{submitterLabel(r.submitted_role)}</Td>
              <Td>
                <Badge tone={STATUS_TONES[r.status]}>{ABSENCE_REQUEST_STATUS_LABELS[r.status]}</Badge>
                {r.reflected_to_attendance && (
                  <p className="mt-0.5 text-[11px] text-gray-400">出欠反映済</p>
                )}
                {r.handled_at && <p className="mt-0.5 text-[11px] text-gray-400">{fmtDate(r.handled_at)}</p>}
              </Td>
              <Td className="max-w-48">
                {r.staff_comment ? (
                  <p className="line-clamp-2 text-gray-600" title={r.staff_comment}>
                    {r.staff_comment}
                  </p>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
              <Td>
                {r.status === "pending" ? (
                  <HandleForm
                    requestId={r.id}
                    existingAttendance={existingAttendance.get(`${r.student_id}|${r.date}`) ?? null}
                  />
                ) : (
                  <span className="text-xs text-gray-400">処理済</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
