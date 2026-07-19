import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtYen } from "@/lib/format";
import { Card, PageHeader, EmptyState, Badge, Table, Td, type BadgeTone } from "@/components/ui";
import { REIMBURSEMENT_STATUS_LABELS } from "@/lib/constants";
import type { Reimbursement, ReimbursementStatus } from "@/lib/types";

const STATUS_TONES: Record<ReimbursementStatus, BadgeTone> = {
  pending: "amber",
  notified: "blue",
  paid: "green",
};

export default async function StudentReimbursementsPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="諸経費の返金" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("reimbursements")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  const records = (data ?? []) as Reimbursement[];

  return (
    <div>
      <PageHeader title="諸経費の返金" description="研修等でかかった諸経費の返金状況です" />

      {records.length === 0 ? (
        <Card>
          <EmptyState message="諸経費の記録はまだありません" />
        </Card>
      ) : (
        <Table headers={["登録日", "内容", "金額", "状況"]}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.created_at)}</Td>
              <Td className="font-medium text-gray-800">
                {r.title}
                {r.notes && <p className="mt-0.5 text-xs text-gray-400">{r.notes}</p>}
              </Td>
              <Td className="whitespace-nowrap font-semibold text-gray-900">{fmtYen(r.amount)}</Td>
              <Td>
                <Badge tone={STATUS_TONES[r.status]}>{REIMBURSEMENT_STATUS_LABELS[r.status]}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
