import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, StatCard, Table, Td, Badge, EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { Notification } from "@/lib/types";

const RELATED_TYPE_LABELS: Record<string, string> = {
  material_request: "資料請求",
  material_sent: "資料発送",
  account_issued: "アカウント発行",
  lead_followup: "フォローアップ",
  consultation_request: "個別相談希望",
  announcement: "お知らせ",
  bulk: "一斉送信",
  survey_request: "アンケート依頼",
  application: "出願受付",
  interview_scheduled: "面接日程",
  admission_decision: "合否通知",
  payment_confirmed: "入金確認",
  overnight_request: "外泊届",
  overnight_approval: "外泊承認",
  overnight_reminder: "外泊督促",
  career_decided: "進路通知",
  reimbursement: "諸経費返金",
  horse_report: "リタッチ報告",
  video_invite: "動画案内",
  contact_inquiry: "お問い合わせ",
  contact_inquiry_ack: "お問い合わせ受付",
  password_reset: "パスワード再設定",
  decision: "合否通知",
  booking: "見学予約",
  payment: "入金",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const channel = sp.channel === "email" || sp.channel === "line" ? sp.channel : undefined;

  const db = adminDb();
  const [totalRes, emailRes, lineRes] = await Promise.all([
    db.from("notifications").select("*", { count: "exact", head: true }),
    db.from("notifications").select("*", { count: "exact", head: true }).eq("channel", "email"),
    db.from("notifications").select("*", { count: "exact", head: true }).eq("channel", "line"),
  ]);

  let query = db.from("notifications").select("*").order("sent_at", { ascending: false }).limit(100);
  if (channel) query = query.eq("channel", channel);
  const { data } = await query;
  const notifications = (data ?? []) as Notification[];

  const tabs = [
    { href: "/admin/notifications", label: "すべて", active: !channel },
    { href: "/admin/notifications?channel=email", label: "📧 メール", active: channel === "email" },
    { href: "/admin/notifications?channel=line", label: "💬 LINE", active: channel === "line" },
  ];

  return (
    <div>
      <PageHeader
        title="送信ログ"
        description="システムから送信されたメール・LINEの記録です(最新100件を表示)"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="総送信数" value={`${totalRes.count ?? 0}件`} />
        <StatCard label="メール" value={`${emailRes.count ?? 0}件`} sub="📧 email" />
        <StatCard label="LINE" value={`${lineRes.count ?? 0}件`} tone="success" sub="💬 line" />
      </div>

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-1.5 text-xs font-semibold transition ${
 t.active
 ? "bg-brand-600 text-white shadow-sm"
 : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
 }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState message="該当する送信ログがありません。" />
      ) : (
        <Table headers={["送信日時", "チャネル", "宛先", "件名", "種別"]}>
          {notifications.map((n) => (
            <tr key={n.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-xs text-gray-500">{fmtDateTime(n.sent_at)}</Td>
              <Td>
                {n.channel === "email" ? <Badge tone="blue">メール</Badge> : <Badge tone="green">LINE</Badge>}
              </Td>
              <Td className="whitespace-nowrap text-sm text-gray-700">{n.recipient}</Td>
              <Td>
                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 max-w-md truncate text-xs text-gray-400">{n.body}</p>
                )}
              </Td>
              <Td className="whitespace-nowrap text-xs text-gray-500">
                {n.related_type ? RELATED_TYPE_LABELS[n.related_type] ?? n.related_type : "—"}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
