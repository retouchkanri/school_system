import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { ABSENCE_REQUEST_STATUS_LABELS, ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import {
  Section,
  PageHeader,
  EmptyState,
  Badge,
  SimpleTable,
  Td,
  SectionTitle,
  type BadgeTone,
} from "@/components/ui";
import type { AbsenceRequest, AbsenceRequestStatus, AttendanceStatus } from "@/lib/types";
import ParentAbsenceForm from "./absence-form";

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

function submitterLabel(role: string | null): string {
  return role === "parent" ? "保護者" : role === "student" ? "本人" : "—";
}

export default async function ParentAbsencePage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="欠席・遅刻の連絡" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("absence_requests")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as AbsenceRequest[];

  return (
    <div>
      <PageHeader
        title="欠席・遅刻の連絡"
        description="体調不良などで欠席・遅刻・早退する場合は事前にご連絡ください"
      />

      <Section title="欠席・遅刻を連絡する">
        <ParentAbsenceForm
          students={students.map((s) => ({ id: s.id, name: s.name, student_number: s.student_number }))}
          defaultDate={toDateInput()}
        />
      </Section>

      {students.map((student) => {
        const own = requests.filter((r) => r.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})の連絡履歴
            </SectionTitle>
            {own.length === 0 ? (
              <Section>
                <EmptyState message="送信した連絡はまだありません" />
              </Section>
            ) : (
              <SimpleTable headers={["日付", "区分", "理由", "提出者", "状態", "職員コメント", "提出日"]}>
                {own.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap text-gray-700">{fmtDate(r.date)}</Td>
                    <Td>
                      <Badge tone={KIND_TONES[r.kind]}>{ATTENDANCE_STATUS_LABELS[r.kind]}</Badge>
                    </Td>
                    <Td className="max-w-[14rem]">
                      <p className="whitespace-pre-wrap text-gray-800">{r.reason}</p>
                      {r.detail && (
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-gray-500">{r.detail}</p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-600">{submitterLabel(r.submitted_role)}</Td>
                    <Td>
                      <Badge tone={STATUS_TONES[r.status]}>{ABSENCE_REQUEST_STATUS_LABELS[r.status]}</Badge>
                    </Td>
                    <Td className="max-w-[14rem]">
                      <p className="whitespace-pre-wrap text-gray-600">{r.staff_comment ?? "—"}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">{fmtDate(r.created_at)}</Td>
                  </tr>
                ))}
              </SimpleTable>
            )}
          </div>
        );
      })}
    </div>
  );
}
