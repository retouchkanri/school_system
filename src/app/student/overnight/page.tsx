import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { APPROVAL_STATUS_LABELS } from "@/lib/constants";
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
import type { ApprovalStatus, OvernightLeaveRequest } from "@/lib/types";
import OvernightForm from "./overnight-form";

const APPROVAL_TONES: Record<ApprovalStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default async function StudentOvernightPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="外泊届" />
        <Section>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("overnight_leave_requests")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as OvernightLeaveRequest[];

  return (
    <div>
      <PageHeader title="外泊届" description="外泊の予定を届け出て、保護者の承認を受けてください" />

      <Section title="外泊届を提出する">
        <OvernightForm defaultDate={toDateInput()} />
      </Section>

      <SectionTitle>提出した届出の一覧</SectionTitle>
      {requests.length === 0 ? (
        <Section>
          <EmptyState message="提出した外泊届はまだありません" />
        </Section>
      ) : (
        <SimpleTable headers={["期間", "行き先", "理由", "承認状況", "保護者コメント", "職員確認", "提出日"]}>
          {requests.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">
                {fmtDate(r.start_date)} 〜 {fmtDate(r.end_date)}
              </Td>
              <Td className="font-medium text-gray-800">{r.destination}</Td>
              <Td className="max-w-[14rem]">
                <p className="whitespace-pre-wrap text-gray-600">{r.reason ?? "—"}</p>
              </Td>
              <Td>
                <Badge tone={APPROVAL_TONES[r.parent_approval]}>{APPROVAL_STATUS_LABELS[r.parent_approval]}</Badge>
              </Td>
              <Td className="max-w-[14rem]">
                <p className="whitespace-pre-wrap text-gray-600">{r.parent_comment ?? "—"}</p>
              </Td>
              <Td>
                {r.staff_acknowledged ? <Badge tone="green">確認済</Badge> : <Badge tone="gray">未確認</Badge>}
              </Td>
              <Td className="whitespace-nowrap text-gray-500">{fmtDate(r.created_at)}</Td>
            </tr>
          ))}
        </SimpleTable>
      )}
    </div>
  );
}
