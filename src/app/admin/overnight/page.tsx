import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { APPROVAL_STATUS_LABELS } from "@/lib/constants";
import {
  PageHeader, StatCard, Table, Td, Badge, EmptyState, btnSmall, type BadgeTone,
} from "@/components/ui";
import type { OvernightLeaveRequest, Student, Profile, ApprovalStatus } from "@/lib/types";
import { acknowledgeRequest, remindParent } from "./actions";

const APPROVAL_TONES: Record<ApprovalStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

type RequestRow = OvernightLeaveRequest & {
  student: Pick<Student, "id" | "name" | "parent_user_id"> | null;
};

export default async function OvernightPage() {
  const db = adminDb();
  const { data: requestsData } = await db
    .from("overnight_leave_requests")
    .select("*, student:students(id, name, parent_user_id)")
    .order("created_at", { ascending: false });

  const requests = (requestsData ?? []) as RequestRow[];

  const parentIds = [...new Set(requests.map((r) => r.student?.parent_user_id).filter((v): v is string => !!v))];
  let parents: Profile[] = [];
  if (parentIds.length > 0) {
    const { data: parentsData } = await db.from("profiles").select("*").in("id", parentIds);
    parents = (parentsData ?? []) as Profile[];
  }
  const parentMap = new Map(parents.map((p) => [p.id, p]));

  const pendingCount = requests.filter((r) => r.parent_approval === "pending").length;
  const approvedCount = requests.filter((r) => r.parent_approval === "approved").length;
  const unacknowledged = requests.filter((r) => !r.staff_acknowledged).length;

  return (
    <div>
      <PageHeader title="外泊届管理" description="生徒の外泊届と保護者承認の状況を確認します" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="全届出数" value={requests.length} />
        <StatCard label="保護者承認待ち" value={pendingCount} tone="warning" />
        <StatCard label="承認済" value={approvedCount} tone="success" />
        <StatCard label="職員未確認" value={unacknowledged} tone={unacknowledged > 0 ? "danger" : "default"} />
      </div>

      {requests.length === 0 ? (
        <EmptyState message="外泊届はまだありません" />
      ) : (
        <Table headers={["生徒", "期間", "行き先", "理由", "保護者承認", "保護者コメント", "職員確認", "操作"]}>
          {requests.map((r) => {
            const parent = r.student?.parent_user_id ? (parentMap.get(r.student.parent_user_id) ?? null) : null;
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap">
                  {r.student ? (
                    <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                      {r.student.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-700">
                  {fmtDate(r.start_date)} 〜 {fmtDate(r.end_date)}
                </Td>
                <Td className="text-gray-800">{r.destination}</Td>
                <Td className="max-w-48">
                  {r.reason ? (
                    <p className="line-clamp-2 text-gray-600" title={r.reason}>
                      {r.reason}
                    </p>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={APPROVAL_TONES[r.parent_approval]}>{APPROVAL_STATUS_LABELS[r.parent_approval]}</Badge>
                  {r.approved_at && r.parent_approval !== "pending" && (
                    <p className="mt-0.5 text-[11px] text-gray-400">{fmtDate(r.approved_at)}</p>
                  )}
                </Td>
                <Td className="max-w-48">
                  {r.parent_comment ? (
                    <p className="line-clamp-2 text-gray-600" title={r.parent_comment}>
                      {r.parent_comment}
                    </p>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td>
                  {r.staff_acknowledged ? <Badge tone="green">確認済</Badge> : <Badge tone="gray">未確認</Badge>}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    {!r.staff_acknowledged && (
                      <form action={acknowledgeRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={btnSmall}>
                          職員確認済にする
                        </button>
                      </form>
                    )}
                    {r.parent_approval === "pending" && (
                      <form action={remindParent}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          disabled={!parent}
                          title={parent ? "保護者へ承認依頼の通知を送ります" : "保護者アカウントが未連携のため送信できません"}
                          className={btnSmall}
                        >
                          📨 保護者へ督促
                        </button>
                      </form>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
