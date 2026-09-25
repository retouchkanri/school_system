import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PROGRESS_STEPS, statusIndex, FOLLOW_UP_RULES } from "@/lib/constants";
import { findFollowUpTargets, getFollowUpSettings } from "@/lib/follow-ups";
import { Card, PageHeader, LeadStatusBadge, SimpleTable, Td, EmptyState, Badge } from "@/components/ui";
import type { Lead, Application, Payment, OvernightLeaveRequest } from "@/lib/types";

/** スキャンしやすいよう 18 ステップを 4 フェーズに分割 */
const FUNNEL_PHASES = [
  { title: "資料・仮審査", from: 0, to: 4 },
  { title: "見学・体験", from: 5, to: 8 },
  { title: "出願・選考", from: 9, to: 12 },
  { title: "入学準備", from: 13, to: 17 },
] as const;

/** ダッシュボード上部の数値タイル。点の色は LeadStatusBadge のステータス色分けに合わせる */
function KpiTile({
  label,
  value,
  unit,
  sub,
  dot,
}: {
  label: string;
  value: number;
  unit: string;
  sub: string;
  dot: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-xs">
      <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1 leading-none">
        <span className="text-[26px] font-semibold tracking-tight text-gray-900">{value}</span>
        <span className="text-xs text-gray-400">{unit}</span>
      </p>
      <p className="mt-2 text-[11px] leading-snug text-gray-400">{sub}</p>
    </div>
  );
}

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

  const approvals = [
    {
      href: "/admin/payments",
      label: "銀行振込の入金確認待ち",
      count: bankTransferWaiting,
      tone: bankTransferWaiting > 0 ? "red" : "gray",
    },
    {
      href: "/admin/overnight",
      label: "外泊届の保護者承認待ち",
      count: overnightPending,
      tone: overnightPending > 0 ? "amber" : "gray",
    },
    {
      href: "/admin/applications",
      label: "出願書類の審査待ち",
      count: reviewWaiting,
      tone: reviewWaiting > 0 ? "blue" : "gray",
    },
  ] as const;

  return (
    // admin-compact: globals.css で文字サイズを一段小さくしている
    <div className="admin-compact">
      <PageHeader title="ダッシュボード" description="入学希望者の状況をひと目で確認できます" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile
          label="今月の資料請求"
          value={monthlyRequests}
          unit="件"
          sub={`${now.getMonth() + 1}月の新規リード`}
          dot="bg-gray-400"
        />
        <KpiTile label="見学予約中" value={visitReserved} unit="人" sub="オープンキャンパス予約済" dot="bg-amber-400" />
        <KpiTile label="出願〜面接中" value={applying} unit="人" sub="選考プロセス進行中" dot="bg-blue-400" />
        <KpiTile label="入学確定" value={enrolled} unit="人" sub="入学式まで到達" dot="bg-brand-500" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="入学ファネル"
          action={<span className="text-[11px] text-gray-400">18ステップの到達人数</span>}
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            {FUNNEL_PHASES.map((phase) => (
              <section key={phase.title}>
                <div className="mb-1 flex items-center gap-3">
                  <h4 className="text-[11px] font-semibold tracking-wide text-brand-700">{phase.title}</h4>
                  <div className="h-px flex-1 bg-gray-100" aria-hidden />
                </div>
                <ol>
                  {PROGRESS_STEPS.slice(phase.from, phase.to + 1).map((s, offset) => {
                    const i = phase.from + offset;
                    const count = funnel[i];
                    const pct = Math.round((count / funnelMax) * 100);
                    const prev = i > 0 ? funnel[i - 1] : count;
                    const drop = prev - count;
                    const stepConv = prev > 0 ? Math.round((count / prev) * 100) : 100;

                    return (
                      <li
                        key={s.key}
                        title={`${s.label}: ${count}人（資料請求比 ${pct}%${drop > 0 ? ` / 前ステップから −${drop}人・維持率 ${stepConv}%` : ""}）`}
                        className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50 sm:gap-3"
                      >
                        <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-gray-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="w-[4.5rem] shrink-0 truncate text-xs text-gray-700 sm:w-20">{s.label}</span>
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100/70">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
                            style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[11px] font-medium tabular-nums text-amber-600">
                          {drop > 0 ? `−${drop}` : ""}
                        </span>
                        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900">
                          {count}
                        </span>
                        <span className="hidden w-10 shrink-0 text-right text-[11px] tabular-nums text-gray-400 sm:inline">
                          {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
          {funnel[0] > 0 && (
            <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] leading-relaxed text-gray-400">
              割合はステップ1（資料請求）の到達人数を100%とした値です。
              <span className="text-amber-600">−n</span>
              は前ステップからの減少人数（行にカーソルを合わせると維持率を表示）。
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="フォロー対象"
            action={
              <Link href="/admin/follow-ups" className="text-xs font-medium text-brand-600 hover:underline">
                一覧を見る →
              </Link>
            }
          >
            <ul className="-my-2 divide-y divide-gray-100">
              {followStats.map(({ rule, total, unsent, autoEnabled }) => (
                <li key={rule.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-gray-700">{rule.label}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      未送信 {unsent}件 ・ 自動送信 {autoEnabled ? "ON" : "OFF"}
                    </p>
                  </div>
                  <Badge tone={autoEnabled ? "blue" : total > 0 ? "amber" : "gray"}>{total}件</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="承認待ち・要対応">
            <ul className="-my-2 divide-y divide-gray-100">
              {approvals.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="group flex items-center justify-between gap-3 py-2.5 text-xs leading-snug text-gray-700"
                  >
                    <span className="min-w-0 group-hover:text-brand-700 group-hover:underline">{a.label}</span>
                    <Badge tone={a.tone}>{a.count}件</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4">
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
            <SimpleTable headers={["氏名", "希望学科", "ステータス", "登録日"]}>
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
            </SimpleTable>
          )}
        </Card>
      </div>
    </div>
  );
}
