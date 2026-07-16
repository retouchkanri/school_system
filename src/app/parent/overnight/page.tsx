import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { APPROVAL_STATUS_LABELS } from "@/lib/constants";
import {
  Card,
  PageHeader,
  EmptyState,
  Badge,
  InfoRow,
  type BadgeTone,
} from "@/components/ui";
import type { ApprovalStatus, OvernightLeaveRequest } from "@/lib/types";
import ApprovalForm from "./approval-form";

const APPROVAL_TONES: Record<ApprovalStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default async function ParentOvernightPage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="外泊届の承認" />
        <Card>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const { data } = await adminDb()
    .from("overnight_leave_requests")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as OvernightLeaveRequest[];
  const pendingCount = requests.filter((r) => r.parent_approval === "pending").length;

  return (
    <div>
      <PageHeader
        title="外泊届の承認"
        description={
          pendingCount > 0
            ? `承認待ちの外泊届が ${pendingCount} 件あります。内容をご確認ください。`
            : "お子様から提出された外泊届の一覧です"
        }
      />

      {requests.length === 0 ? (
        <Card>
          <EmptyState message="提出された外泊届はまだありません" />
        </Card>
      ) : (
        <div className="space-y-6">
          {requests.map((r) => {
            const child = studentMap.get(r.student_id);
            return (
              <Card
                key={r.id}
                title={`${child?.name ?? "—"} さんの外泊届(${fmtDate(r.start_date)} 〜 ${fmtDate(r.end_date)})`}
                action={
                  <Badge tone={APPROVAL_TONES[r.parent_approval]}>
                    {APPROVAL_STATUS_LABELS[r.parent_approval]}
                  </Badge>
                }
              >
                <dl className="mb-2">
                  <InfoRow label="期間" value={`${fmtDate(r.start_date)} 〜 ${fmtDate(r.end_date)}`} />
                  <InfoRow label="行き先" value={r.destination} />
                  <InfoRow
                    label="理由"
                    value={<span className="whitespace-pre-wrap">{r.reason ?? "—"}</span>}
                  />
                  <InfoRow label="提出日時" value={fmtDateTime(r.created_at)} />
                  {r.parent_approval !== "pending" && (
                    <>
                      <InfoRow label="保護者コメント" value={r.parent_comment ?? "—"} />
                      <InfoRow label="回答日時" value={fmtDateTime(r.approved_at)} />
                      <InfoRow
                        label="職員確認"
                        value={
                          r.staff_acknowledged ? (
                            <Badge tone="green">確認済</Badge>
                          ) : (
                            <Badge tone="gray">未確認</Badge>
                          )
                        }
                      />
                    </>
                  )}
                </dl>
                {r.parent_approval === "pending" && <ApprovalForm requestId={r.id} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
