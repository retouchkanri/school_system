import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtYen } from "@/lib/format";
import { StatCard, EmptyState, Badge, Table, Td, type BadgeTone } from "@/components/ui";
import type { Payment } from "@/lib/types";
import { TUITION_STATE_LABELS, tuitionState, type TuitionState } from "./data";

/**
 * 生徒側 (/student/tuition) と保護者側 (/parent/tuition) で共有する学費の表示部品。
 * 取得は必ず type='tuition' に限定し、入学金・制服代などには一切触れない。
 */

const STATE_TONES: Record<TuitionState, BadgeTone> = {
  paid: "green",
  unpaid: "gray",
  overdue: "red",
  void: "gray",
};

/** 納付期限が近いとみなす日数 */
const DUE_SOON_DAYS = 14;

/** 指定した生徒たちの学費 (type='tuition') をまとめて取得する */
export async function loadTuitionPayments(studentIds: string[]): Promise<Payment[]> {
  if (studentIds.length === 0) return [];
  const { data } = await adminDb()
    .from("payments")
    .select("*")
    .eq("type", "tuition")
    .in("student_id", studentIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as Payment[];
}

export interface FamilyTuitionSummary {
  billed: number;
  paid: number;
  unpaid: number;
}

export function summarizeTuition(payments: Payment[], today: string): FamilyTuitionSummary {
  const states = payments.map((p) => ({ p, state: tuitionState(p, today) }));
  return {
    billed: states.filter((s) => s.state !== "void").reduce((sum, s) => sum + s.p.amount, 0),
    paid: states.filter((s) => s.state === "paid").reduce((sum, s) => sum + s.p.amount, 0),
    unpaid: states
      .filter((s) => s.state === "unpaid" || s.state === "overdue")
      .reduce((sum, s) => sum + s.p.amount, 0),
  };
}

export function FamilyTuitionStats({ summary }: { summary: FamilyTuitionSummary }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="請求総額" value={fmtYen(summary.billed)} />
      <StatCard label="納付済" value={fmtYen(summary.paid)} tone="success" />
      <StatCard label="未納" value={fmtYen(summary.unpaid)} tone={summary.unpaid > 0 ? "warning" : "default"} />
    </div>
  );
}

/** 納付期限までの残り日数 (期限が無ければ null) */
function daysUntil(due: string | null, today: string): number | null {
  if (!due) return null;
  const d = Date.parse(`${due}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (isNaN(d) || isNaN(t)) return null;
  return Math.round((d - t) / 86400000);
}

export function FamilyTuitionTable({ payments, today }: { payments: Payment[]; today: string }) {
  if (payments.length === 0) {
    return <EmptyState message="学費の請求はまだありません" />;
  }

  return (
    <Table headers={["名目", "金額", "納付期限", "状態", "納付日"]}>
      {payments.map((p) => {
        const state = tuitionState(p, today);
        const remaining = daysUntil(p.due_date, today);
        const dueSoon = state === "unpaid" && remaining !== null && remaining <= DUE_SOON_DAYS;
        return (
          <tr
            key={p.id}
            className={state === "overdue" ? "bg-red-50" : dueSoon ? "bg-amber-50" : "hover:bg-gray-50"}
          >
            <Td className="font-medium text-gray-800">
              {p.installment_label ?? "学費"}
              {p.memo && <p className="mt-0.5 text-xs text-gray-400">{p.memo}</p>}
            </Td>
            <Td className="whitespace-nowrap font-semibold text-gray-900">{fmtYen(p.amount)}</Td>
            <Td className="whitespace-nowrap text-gray-600">
              {fmtDate(p.due_date)}
              {state === "overdue" && <span className="ml-1 text-xs font-bold text-red-600">期限を過ぎています</span>}
              {dueSoon && <span className="ml-1 text-xs font-bold text-amber-700">あと{remaining}日</span>}
            </Td>
            <Td>
              <Badge tone={STATE_TONES[state]}>{TUITION_STATE_LABELS[state]}</Badge>
            </Td>
            <Td className="whitespace-nowrap text-gray-600">{fmtDate(p.paid_at)}</Td>
          </tr>
        );
      })}
    </Table>
  );
}
