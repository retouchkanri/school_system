import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime, toDateInput, daysAgo } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/constants";
import {
  Card,
  PageHeader,
  StatCard,
  EmptyState,
  Badge,
  InfoRow,
  SectionTitle,
} from "@/components/ui";
import type {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  Horse,
  OvernightLeaveRequest,
} from "@/lib/types";

export default async function ParentHomePage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="ホーム" description="保護者ポータル" />
        <Card title="お子様情報">
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const db = adminDb();
  const studentIds = students.map((s) => s.id);
  const weekStart = toDateInput(daysAgo((new Date().getDay() + 6) % 7)); // 今週(月曜)から

  const horseIds = students
    .map((s) => s.assigned_horse_id)
    .filter((v): v is string => v !== null && v !== "");

  const [horsesRes, attRes, pendingRes, annRes] = await Promise.all([
    horseIds.length > 0
      ? db.from("horses").select("*").in("id", horseIds)
      : Promise.resolve({ data: [] as Horse[] }),
    db.from("attendance_records").select("*").in("student_id", studentIds).gte("date", weekStart),
    db
      .from("overnight_leave_requests")
      .select("*")
      .in("student_id", studentIds)
      .eq("parent_approval", "pending"),
    db
      .from("announcements")
      .select("*")
      .in("audience", ["parent", "all"])
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const horses = (horsesRes.data ?? []) as Horse[];
  const horseMap = new Map(horses.map((h) => [h.id, h]));
  const weekRecords = (attRes.data ?? []) as AttendanceRecord[];
  const pendingRequests = (pendingRes.data ?? []) as OvernightLeaveRequest[];
  const announcements = (annRes.data ?? []) as Announcement[];

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, early_leave: 0 };
  for (const r of weekRecords) counts[r.status] += 1;

  return (
    <div>
      <PageHeader title="ホーム" description={`${profile.full_name} 様`} />

      {pendingRequests.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>
            ⚠️ 承認待ちの外泊届が <strong>{pendingRequests.length} 件</strong> あります。内容をご確認のうえ、承認をお願いします。
          </span>
          <Link href="/parent/overnight" className="font-semibold text-red-800 underline">
            承認画面へ →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {students.map((s) => {
          const horse = s.assigned_horse_id ? horseMap.get(s.assigned_horse_id) : undefined;
          return (
            <Card key={s.id} title={`お子様情報: ${s.name}`}>
              <dl>
                <InfoRow label="学籍番号" value={s.student_number} />
                <InfoRow label="クラス" value={s.class_name ?? "—"} />
                <InfoRow label="寮部屋" value={s.dorm_room ?? "—"} />
                <InfoRow
                  label="担当馬"
                  value={horse ? `${horse.name}(馬房: ${horse.stall ?? s.stall_number ?? "—"})` : "未設定"}
                />
                <InfoRow label="入学日" value={fmtDate(s.enrollment_date)} />
              </dl>
            </Card>
          );
        })}
      </div>

      <SectionTitle>今週の出欠サマリ</SectionTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="出席" value={counts.present} tone="success" sub={`${fmtDate(weekStart)} 〜`} />
        <StatCard label="欠席" value={counts.absent} tone="danger" sub={`${fmtDate(weekStart)} 〜`} />
        <StatCard label="遅刻" value={counts.late} tone="warning" sub={`${fmtDate(weekStart)} 〜`} />
        <StatCard label="早退" value={counts.early_leave} sub={`${fmtDate(weekStart)} 〜`} />
      </div>

      <SectionTitle>最新のお知らせ</SectionTitle>
      <Card>
        {announcements.length === 0 ? (
          <EmptyState message="お知らせはまだありません" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {announcements.map((a) => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <Badge tone={a.audience === "all" ? "gray" : "brand"}>{AUDIENCE_LABELS[a.audience]}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(a.published_at)}</p>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-right">
          <Link href="/parent/announcements" className="text-sm font-medium text-brand-600 hover:underline">
            すべて見る →
          </Link>
        </div>
      </Card>
    </div>
  );
}
