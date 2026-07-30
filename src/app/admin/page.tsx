import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PROGRESS_STEPS, statusIndex, FOLLOW_UP_RULES } from "@/lib/constants";
import { findFollowUpTargets, getFollowUpSettings } from "@/lib/follow-ups";
import { Card, PageHeader, StatCard, LeadStatusBadge, Table, Td, EmptyState, Badge } from "@/components/ui";
import type { Lead, Application, Payment, OvernightLeaveRequest } from "@/lib/types";

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const db = adminDb();
  const [
    { data: leadsData },
    { data: appsData },
    { data: paymentsData },
    { data: overnightData },
    followTargets,
    followSettings,
  ] = await Promise.all([
    db.from("leads").select("*").order("created_at", { ascending: false }),
    db.from("applications").select("*"),
    // 学費 (type='tuition') は /admin/tuition 専用のため、この画面の「入金確認待ち」件数からは除外する
    // (リンク先の /admin/payments も同じ条件で除外しており、件数と一覧を一致させる)
    db.from("payments").select("*").neq("type", "tuition"),
    db.from("overnight_leave_requests").select("*"),
    findFollowUpTargets(),
    getFollowUpSettings(),
  ]);

  const leads = (leadsData ?? []) as Lead[];
  const applications = (appsData ?? []) as Application[];
  const payments = (paymentsData ?? []) as Payment[];
  const overnights = (overnightData ?? []) as OvernightLeaveRequest[];

  /* ---- StatCard 集計 ---- */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRequests = leads.filter((l) => new Date(l.created_at) >= monthStart).length;
  const visitReserved = leads.filter((l) => l.status === "visit_reserved").length;
  const applying = leads.filter((l) => ["applied", "aptitude_done", "interview"].includes(l.status)).length;
  const enrolled = leads.filter((l) => l.status === "enrolled").length;

  /* ---- 入学ファネル: 各ステップ以上に到達した人数 ---- */
  const funnel = PROGRESS_STEPS.map((_, i) => leads.filter((l) => statusIndex(l.status) >= i).length);
  const funnelMax = Math.max(funnel[0], 1);

  /* ---- フォロー対象 3ルール件数 (admin/follow-ups と同じ判定ロジックを共有) ---- */
  const followStats = FOLLOW_UP_RULES.map((rule) => {
    const rows = followTargets[rule.key] ?? [];
    const setting = followSettings[rule.key];
    return {
      rule,
      total: rows.length,
      unsent: rows.filter((r) => !r.sent).length,
      autoEnabled: setting.auto_enabled,
    };
  });

  /* ---- 承認待ち・要対応 ---- */
  const bankTransferWaiting = payments.filter(
    (p) => p.method === "bank_transfer" && (p.status === "pending" || p.status === "paid")
  ).length;
  const overnightPending = overnights.filter((o) => o.parent_approval === "pending").length;
  const reviewWaiting = applications.filter((a) => a.status === "submitted" || a.status === "under_review").length;

  const recentLeads = leads.slice(0, 8);

  return (
    <div>
      <PageHeader title="ダッシュボード" description="入学希望者の状況をひと目で確認できます" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="今月の資料請求" value={monthlyRequests} sub={`${now.getMonth() + 1}月の新規リード`} />
        <StatCard label="見学予約中" value={visitReserved} sub="オープンキャンパス予約済" tone="warning" />
        <StatCard label="出願〜面接中" value={applying} sub="選考プロセス進行中" />
        <StatCard label="入学確定" value={enrolled} sub="入学式まで到達" tone="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="入学ファネル (18ステップ到達人数)" className="lg:col-span-2">
          <div className="space-y-1.5">
            {PROGRESS_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-right text-[11px] font-medium text-gray-500">
                  {i + 1}. {s.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${Math.round((funnel[i] / funnelMax) * 100)}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-bold text-gray-700">{funnel[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card
            title="フォロー対象"
            action={
              <Link href="/admin/follow-ups" className="text-xs font-semibold text-brand-600 hover:underline">
                一覧を見る →
              </Link>
            }
          >
            <ul className="space-y-3">
              {followStats.map(({ rule, total, unsent, autoEnabled }) => (
                <li key={rule.key} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-600">
                    {rule.label}
                    <span className="mt-0.5 block text-[11px] text-gray-400">
                      未送信 {unsent}件 ・ {autoEnabled ? "自動送信ON" : "自動送信OFF"}
                    </span>
                  </span>
                  <Badge tone={autoEnabled ? "blue" : total > 0 ? "amber" : "gray"}>{total}件</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="承認待ち・要対応">
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3">
                <Link href="/admin/payments" className="text-xs text-gray-600 hover:text-brand-600 hover:underline">
                  銀行振込の入金確認待ち
                </Link>
                <Badge tone={bankTransferWaiting > 0 ? "red" : "gray"}>{bankTransferWaiting}件</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <Link href="/admin/overnight" className="text-xs text-gray-600 hover:text-brand-600 hover:underline">
                  外泊届の保護者承認待ち
                </Link>
                <Badge tone={overnightPending > 0 ? "amber" : "gray"}>{overnightPending}件</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <Link
                  href="/admin/applications"
                  className="text-xs text-gray-600 hover:text-brand-600 hover:underline"
                >
                  出願書類の審査待ち
                </Link>
                <Badge tone={reviewWaiting > 0 ? "blue" : "gray"}>{reviewWaiting}件</Badge>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Card
          title="最近のリード"
          action={
            <Link href="/admin/leads" className="text-xs font-semibold text-brand-600 hover:underline">
              すべて見る →
            </Link>
          }
        >
          {recentLeads.length === 0 ? (
            <EmptyState message="リードはまだ登録されていません" />
          ) : (
            <Table headers={["氏名", "希望学科", "ステータス", "登録日"]}>
              {recentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <Td>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </Td>
                  <Td className="text-gray-600">{lead.desired_course ?? "—"}</Td>
                  <Td>
                    <LeadStatusBadge status={lead.status} />
                  </Td>
                  <Td className="text-gray-500">{fmtDate(lead.created_at)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
