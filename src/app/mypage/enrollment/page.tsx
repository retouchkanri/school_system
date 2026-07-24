import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import {
  PROCEDURE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  BANK_TRANSFER_INFO,
} from "@/lib/constants";
import { fmtDateTime, fmtYen } from "@/lib/format";
import {
  Card,
  PageHeader,
  Badge,
  SectionTitle,
  btnPrimary,
  btnSecondary,
  type BadgeTone,
} from "@/components/ui";
import type {
  AdmissionDecision,
  EnrollmentProcedure,
  Payment,
  PaymentStatus,
  PaymentType,
  ProcedureStatus,
} from "@/lib/types";
import EnrollmentForm from "./enrollment-form";
import { payEnrollmentFeeAction } from "./actions";
import { isDevPhase } from "@/lib/dev";

const FEES: { type: PaymentType; label: string; amount: number }[] = [
  { type: "admission_fee", label: "入学金", amount: 300000 },
  { type: "uniform", label: "制服代", amount: 85000 },
  { type: "materials", label: "教材費", amount: 42000 },
];

const PROCEDURE_TONE: Record<ProcedureStatus, BadgeTone> = {
  not_started: "gray",
  in_progress: "amber",
  completed: "green",
};

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  pending: "amber",
  paid: "blue",
  confirmed: "green",
  refunded: "gray",
  cancelled: "gray",
};

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ pay_error?: string; stripe?: string }>;
}) {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  const sp = await searchParams;

  if (!lead) {
    return (
      <div>
        <PageHeader title="入学手続き" />
        <Card>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { data: decisionData } = await adminDb()
    .from("admission_decisions")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();
  const decision = (decisionData as AdmissionDecision | null) ?? null;
  const bypass = isDevPhase();
  const accepted = !!decision && decision.result === "accepted" && !!decision.notified_at;

  // 合格者のみ利用可能 (開発中はスキップ可)
  if (!accepted && !bypass) {
    return (
      <div>
        <PageHeader title="入学手続き" />
        <Card>
          <div className="py-6 text-center">
            <p className="text-3xl">🗂️</p>
            <p className="mt-3 text-sm font-bold text-gray-800">入学手続きは合格された方のみご利用いただけます</p>
            <p className="mt-2 text-sm text-gray-500">
              選考結果は合否確認ページでご確認ください。合格通知の到着後、こちらのページで手続きを進められます。
            </p>
            <Link href="/mypage/result" className={`${btnPrimary} mt-5`}>
              合否確認ページへ →
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const [{ data: procedureData }, { data: paymentsData }] = await Promise.all([
    adminDb().from("enrollment_procedures").select("*").eq("lead_id", lead.id).maybeSingle(),
    adminDb()
      .from("payments")
      .select("*")
      .eq("lead_id", lead.id)
      .in("type", ["admission_fee", "uniform", "materials"])
      .order("created_at", { ascending: true }),
  ]);
  const procedure = (procedureData as EnrollmentProcedure | null) ?? null;
  const payments = ((paymentsData as Payment[] | null) ?? []).slice();
  const status: ProcedureStatus = procedure?.status ?? "not_started";
  // 支払いアクションと同じ「種別ごとの最新行」で表示を揃える (旧データの重複行があっても画面が古い行で固まらないように)
  const latestByType = new Map<Payment["type"], Payment>();
  for (const p of payments) latestByType.set(p.type, p); // created_at 昇順のため最後の代入が最新
  const latestPayments = [...latestByType.values()];
  const hasPendingBank = latestPayments.some((p) => p.method === "bank_transfer" && p.status === "pending");

  return (
    <div>
      <PageHeader
        title="入学手続き"
        description="ご入学おめでとうございます。提出物の確認・サイズ登録・規約同意・お支払いを進めてください。"
        action={<Badge tone={PROCEDURE_TONE[status]}>{PROCEDURE_STATUS_LABELS[status]}</Badge>}
      />

      {sp.pay_error && (
        <div className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          現在オンラインカード決済は準備中です。お手数ですが銀行振込をご選択ください。
        </div>
      )}

      {sp.stripe === "success" && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ お支払いが完了しました(確認メールをお送りしています)。
        </div>
      )}
      {sp.stripe === "cancel" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          カード決済がキャンセルされました。お支払いは完了していません。あらためてお手続きください。
        </div>
      )}

      {bypass && !accepted && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          開発モード: 選考結果に関わらず入学手続きページを確認できます
        </div>
      )}

      {status === "completed" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-bold">✓ 手続き入力は完了しています (署名日時: {fmtDateTime(procedure?.signed_at)})</p>
          <p className="mt-1">内容の変更が必要な場合は、フォームを修正して再度保存してください。</p>
        </div>
      )}

      <EnrollmentForm procedure={procedure} />

      <SectionTitle>お支払い</SectionTitle>
      <p className="mb-3 text-xs text-gray-400">
        ※ 表示の金額は開発中の仮価格です。正式なものではなく、今後変更になる場合があります。
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {FEES.map((fee) => {
          const payment = latestByType.get(fee.type) ?? null;
          return (
            <Card key={fee.type} title={fee.label}>
              <p className="text-2xl font-bold text-gray-900">{fmtYen(fee.amount)}</p>
              {payment ? (
                <div className="mt-3 space-y-1.5 text-sm">
                  <p>
                    <Badge tone={PAYMENT_TONE[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                  </p>
                  <p className="text-xs text-gray-500">
                    {payment.method ? PAYMENT_METHOD_LABELS[payment.method] : "—"}
                    {payment.paid_at ? ` / ${fmtDateTime(payment.paid_at)}` : ""}
                  </p>
                  {payment.method === "bank_transfer" && payment.status === "pending" && (
                    <p className="text-xs text-amber-700">お振込をお待ちしています</p>
                  )}
                  {payment.method === "credit_card" && payment.status === "pending" && (
                    <form action={payEnrollmentFeeAction}>
                      <input type="hidden" name="type" value={fee.type} />
                      <input type="hidden" name="method" value="credit_card" />
                      <button type="submit" className={`${btnPrimary} w-full`}>
                        決済ページへ進む
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <form action={payEnrollmentFeeAction}>
                    <input type="hidden" name="type" value={fee.type} />
                    <input type="hidden" name="method" value="credit_card" />
                    <button type="submit" className={`${btnPrimary} w-full`}>
                      カードで支払う
                    </button>
                  </form>
                  <form action={payEnrollmentFeeAction}>
                    <input type="hidden" name="type" value={fee.type} />
                    <input type="hidden" name="method" value="bank_transfer" />
                    <button type="submit" className={`${btnSecondary} w-full`}>
                      銀行振込にする
                    </button>
                  </form>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {hasPendingBank && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">お振込のご案内 (銀行振込を選択された方)</p>
          <p className="mt-1">下記口座へお振込をお願いいたします。入金確認後、お支払い状況が更新されます。</p>
          <p className="mt-2 rounded bg-white px-3 py-2 font-semibold">{BANK_TRANSFER_INFO}</p>
          <p className="mt-1 text-xs">※ 振込手数料はご負担ください。お名前は入学者ご本人の氏名でお願いします。</p>
        </div>
      )}
    </div>
  );
}
