import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime, fmtYen } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/constants";
import {
  PageHeader,
  StatCard,
  EmptyState,
  Badge,
  Table,
  Td,
  btnSmall,
  type BadgeTone,
} from "@/components/ui";
import type { Payment } from "@/lib/types";
import { confirmPaymentAction } from "./actions";

type PaymentRow = Payment & {
  leads: { name: string } | null;
  students: { name: string } | null;
};

const STATUS_TONES: Record<Payment["status"], BadgeTone> = {
  pending: "amber",
  paid: "blue",
  confirmed: "green",
  refunded: "gray",
  cancelled: "gray",
};

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const db = adminDb();

  const { data: paymentsData } = await db
    .from("payments")
    .select("*, leads(name), students(name)")
    .order("created_at", { ascending: false });
  const payments = (paymentsData ?? []) as PaymentRow[];

  const now = new Date();
  const isThisMonth = (d: string | null): boolean => {
    if (!d) return false;
    const date = new Date(d);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const awaitingCount = payments.filter(
    (p) => p.status === "pending" || p.status === "paid"
  ).length;
  const monthConfirmedTotal = payments
    .filter((p) => p.status === "confirmed" && isThisMonth(p.paid_at))
    .reduce((sum, p) => sum + p.amount, 0);
  const outstandingTotal = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="入金管理"
        description="オープンキャンパス参加費・入学金などの決済状況を確認します"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="入金確認待ち"
          value={`${awaitingCount}件`}
          tone={awaitingCount > 0 ? "warning" : "default"}
          sub="未入金・決済済(未確認)の合計"
        />
        <StatCard
          label="今月の確認済み金額"
          value={fmtYen(monthConfirmedTotal)}
          tone="success"
          sub={`${now.getFullYear()}年${now.getMonth() + 1}月`}
        />
        <StatCard
          label="未収金額"
          value={fmtYen(outstandingTotal)}
          tone={outstandingTotal > 0 ? "danger" : "default"}
          sub="未入金分の合計"
        />
      </div>

      {payments.length === 0 ? (
        <EmptyState message="決済データがまだありません" />
      ) : (
        <Table headers={["対象者", "種別", "金額", "決済方法", "状況", "支払日", "操作"]}>
          {payments.map((p) => {
            const canConfirm = p.status === "pending" || p.status === "paid";
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td className="font-medium text-gray-900">
                  {p.leads?.name ?? p.students?.name ?? "—"}
                  {p.students && (
                    <span className="ml-1 text-[11px] font-normal text-gray-400">(在校生)</span>
                  )}
                </Td>
                <Td className="text-gray-600">{PAYMENT_TYPE_LABELS[p.type]}</Td>
                <Td className="font-semibold text-gray-900">{fmtYen(p.amount)}</Td>
                <Td className="text-gray-600">{p.method ? PAYMENT_METHOD_LABELS[p.method] : "—"}</Td>
                <Td>
                  <Badge tone={STATUS_TONES[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                </Td>
                <Td className="text-gray-600">{fmtDateTime(p.paid_at)}</Td>
                <Td>
                  {canConfirm ? (
                    <form action={confirmPaymentAction}>
                      <input type="hidden" name="payment_id" value={p.id} />
                      <button className={`${btnSmall} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                        入金確認
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {p.status === "confirmed" ? "✓ 確認済" : "—"}
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
