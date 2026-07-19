import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime, fmtYen } from "@/lib/format";
import { PageHeader, Card, StatCard, Table, Td, Badge, EmptyState, btnSmall, type BadgeTone } from "@/components/ui";
import { REIMBURSEMENT_STATUS_LABELS } from "@/lib/constants";
import type { Student, Reimbursement, ReimbursementStatus } from "@/lib/types";
import ReimbursementForm, { type StudentOption } from "./reimbursement-form";
import { notifyReimbursementAction, markReimbursementPaidAction } from "./actions";

type ReimbursementRow = Reimbursement & { student: Pick<Student, "id" | "name"> | null };

const STATUS_TONES: Record<ReimbursementStatus, BadgeTone> = {
  pending: "amber",
  notified: "blue",
  paid: "green",
};

export default async function AdminReimbursementsPage() {
  const db = adminDb();

  const [{ data: reimbursementsData }, { data: studentsData }] = await Promise.all([
    db
      .from("reimbursements")
      .select("*, student:students(id, name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
  ]);

  const reimbursements = (reimbursementsData ?? []) as ReimbursementRow[];
  const students = (studentsData ?? []) as Student[];
  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));

  const pendingCount = reimbursements.filter((r) => r.status === "pending").length;
  const outstandingTotal = reimbursements
    .filter((r) => r.status !== "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <PageHeader title="諸経費精算" description="研修等でかかった諸経費の返金を記録・連絡します" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="未通知" value={`${pendingCount}件`} tone={pendingCount > 0 ? "warning" : "default"} />
        <StatCard label="返金予定額" value={fmtYen(outstandingTotal)} sub="未通知・通知済(未返金)の合計" />
      </div>

      <Card title="新規諸経費の登録" className="mb-6">
        <ReimbursementForm students={studentOptions} />
      </Card>

      <h2 className="mb-4 text-base font-bold text-gray-800">一覧 (新しい順50件)</h2>
      {reimbursements.length === 0 ? (
        <EmptyState message="諸経費の記録はまだありません" />
      ) : (
        <Table headers={["登録日時", "生徒", "内容", "金額", "状況", "操作"]}>
          {reimbursements.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-xs text-gray-500">{fmtDateTime(r.created_at)}</Td>
              <Td className="whitespace-nowrap">
                {r.student ? (
                  <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {r.student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="max-w-56">
                <p className="text-gray-800">{r.title}</p>
                {r.notes && <p className="mt-0.5 text-xs text-gray-400">{r.notes}</p>}
              </Td>
              <Td className="whitespace-nowrap font-semibold text-gray-900">{fmtYen(r.amount)}</Td>
              <Td>
                <Badge tone={STATUS_TONES[r.status]}>{REIMBURSEMENT_STATUS_LABELS[r.status]}</Badge>
              </Td>
              <Td className="whitespace-nowrap">
                <div className="flex gap-1.5">
                  {r.status === "pending" && (
                    <form action={notifyReimbursementAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={`${btnSmall} border-blue-300 text-blue-700 hover:bg-blue-50`}>本人へ通知</button>
                    </form>
                  )}
                  {r.status !== "paid" && (
                    <form action={markReimbursementPaidAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={`${btnSmall} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                        返金完了にする
                      </button>
                    </form>
                  )}
                  {r.status === "paid" && <span className="text-xs text-gray-400">✓ 完了</span>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
