import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtYen } from "@/lib/format";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  Table,
  Td,
  Label,
  SectionTitle,
  inputCls,
  btnSecondary,
  btnSmall,
  type BadgeTone,
} from "@/components/ui";
import {
  fetchTuition,
  parseFilters,
  STATE_FILTER_OPTIONS,
  TUITION_STATE_LABELS,
  type TuitionState,
} from "./data";
import { recordTuitionPaymentAction, revertTuitionPaymentAction } from "./actions";
import BillForm from "./bill-form";
import OverdueNotifyButton from "./overdue-notify-button";

const STATE_TONES: Record<TuitionState, BadgeTone> = {
  paid: "green",
  unpaid: "gray",
  overdue: "red",
  void: "gray",
};

export default async function AdminTuitionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const { rows, summary, labels, classes, students, today } = await fetchTuition(filters);

  const exportQuery = new URLSearchParams();
  if (filters.label) exportQuery.set("label", filters.label);
  if (filters.state !== "all") exportQuery.set("state", filters.state);
  if (filters.className) exportQuery.set("class", filters.className);
  const exportQs = exportQuery.toString();
  const exportHref = `/admin/tuition/export${exportQs ? `?${exportQs}` : ""}`;

  const filtered = !!filters.label || filters.state !== "all" || !!filters.className;

  return (
    <div>
      <PageHeader
        title="学費・納付管理"
        description="学費の請求と納付状況 (納付日・未納) を一覧で管理します"
        action={
          <a href={exportHref} className={btnSmall}>
            ⬇ CSVダウンロード
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="請求総額" value={fmtYen(summary.billedTotal)} sub="学費のみ (キャンセル分を除く)" />
        <StatCard label="入金済額" value={fmtYen(summary.paidTotal)} tone="success" />
        <StatCard
          label="未納額"
          value={fmtYen(summary.unpaidTotal)}
          tone={summary.unpaidTotal > 0 ? "warning" : "default"}
        />
        <StatCard
          label="期限超過"
          value={`${summary.overdueCount}件`}
          tone={summary.overdueCount > 0 ? "danger" : "default"}
          sub={`基準日: ${fmtDate(today)}`}
        />
      </div>

      <BillForm students={students} classes={classes} />

      <SectionTitle>納付状況</SectionTitle>

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem]">
            <Label>名目</Label>
            <select name="label" defaultValue={filters.label} className={inputCls}>
              <option value="">すべて</option>
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem]">
            <Label>状態</Label>
            <select name="state" defaultValue={filters.state} className={inputCls}>
              {STATE_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[10rem]">
            <Label>クラス</Label>
            <select name="class" defaultValue={filters.className} className={inputCls}>
              <option value="">すべて</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={btnSecondary}>
            絞り込む
          </button>
          {filtered && (
            <Link href="/admin/tuition" className={btnSmall}>
              条件をクリア
            </Link>
          )}
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-500">{rows.length}件を表示中</p>
        <OverdueNotifyButton count={summary.overdueCount} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="該当する学費の請求がありません" />
      ) : (
        <Table
          headers={[
            "学籍番号",
            "氏名",
            "クラス",
            "名目",
            "金額",
            "納付期限",
            "状態",
            "納付日",
            "操作",
          ]}
        >
          {rows.map(({ payment, student, state }) => (
            <tr key={payment.id} className={`hover:bg-gray-50 ${state === "overdue" ? "bg-red-50/40" : ""}`}>
              <Td className="whitespace-nowrap font-mono text-xs text-gray-500">
                {student?.student_number ?? "—"}
              </Td>
              <Td className="whitespace-nowrap font-medium text-gray-900">
                {student ? (
                  <Link href={`/admin/students/${student.id}`} className="text-brand-700 hover:underline">
                    {student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap text-gray-600">{student?.class_name ?? "—"}</Td>
              <Td className="text-gray-800">
                {payment.installment_label ?? "学費"}
                {payment.memo && <p className="mt-0.5 text-xs text-gray-400">{payment.memo}</p>}
              </Td>
              <Td className="whitespace-nowrap font-semibold text-gray-900">{fmtYen(payment.amount)}</Td>
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(payment.due_date)}</Td>
              <Td>
                <Badge tone={STATE_TONES[state]}>{TUITION_STATE_LABELS[state]}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(payment.paid_at)}</Td>
              <Td>
                {state === "paid" ? (
                  <form action={revertTuitionPaymentAction}>
                    <input type="hidden" name="payment_id" value={payment.id} />
                    <button className={`${btnSmall} border-red-300 text-red-700 hover:bg-red-50`}>
                      記録を取り消す
                    </button>
                  </form>
                ) : (
                  <form action={recordTuitionPaymentAction} className="flex items-center gap-2">
                    <input type="hidden" name="payment_id" value={payment.id} />
                    <input
                      type="date"
                      name="paid_on"
                      defaultValue={today}
                      required
                      aria-label="納付日"
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button className={`${btnSmall} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                      入金を記録
                    </button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <p className="mt-4 text-xs text-gray-400">
        ※ このページは学費 (種別「学費」) のみを扱います。入学金・制服代・オープンキャンパス参加費は
        <Link href="/admin/payments" className="mx-1 text-brand-600 hover:underline">
          入金管理
        </Link>
        でご確認ください。
      </p>
    </div>
  );
}
