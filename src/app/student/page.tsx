import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime, toDateInput } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, AUDIENCE_LABELS } from "@/lib/constants";
import {
  Section,
  PageHeader,
  Stat,
  EmptyState,
  Badge,
  InfoRow,
  SectionTitle,
  type BadgeTone,
} from "@/components/ui";
import type {
  Announcement,
  AttendanceRecord,
  AttendanceStatus,
  Horse,
  OvernightLeaveRequest,
} from "@/lib/types";

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "green",
  absent: "red",
  late: "amber",
  early_leave: "blue",
};

export default async function StudentHomePage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="ホーム" description="在校生ポータル" />
        <Section title="生徒情報">
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const db = adminDb();
  const today = toDateInput();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const horse: Horse | null = student.assigned_horse_id
    ? (((await db.from("horses").select("*").eq("id", student.assigned_horse_id).maybeSingle()).data as Horse | null) ?? null)
    : null;

  const [todayRes, monthRes, annRes, pendingRes] = await Promise.all([
    db.from("attendance_records").select("*").eq("student_id", student.id).eq("date", today).maybeSingle(),
    db.from("attendance_records").select("*").eq("student_id", student.id).gte("date", monthStart),
    db
      .from("announcements")
      .select("*")
      .in("audience", ["student", "all"])
      .order("published_at", { ascending: false })
      .limit(3),
    db
      .from("overnight_leave_requests")
      .select("*")
      .eq("student_id", student.id)
      .eq("parent_approval", "pending"),
  ]);

  const todayAttendance = (todayRes.data as AttendanceRecord | null) ?? null;
  const monthRecords = (monthRes.data ?? []) as AttendanceRecord[];
  const announcements = (annRes.data ?? []) as Announcement[];
  const pendingRequests = (pendingRes.data ?? []) as OvernightLeaveRequest[];

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, early_leave: 0 };
  for (const r of monthRecords) counts[r.status] += 1;

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/banner-student.jpg"
        alt="馬を信じること。"
        className="mb-6 h-36 w-full rounded-xl object-cover sm:h-48"
      />
      <PageHeader title="ホーム" description={`こんにちは、${student.name} さん`} />

      {pendingRequests.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>🌙 保護者の承認待ちの外泊届が {pendingRequests.length} 件あります。</span>
          <Link href="/student/overnight" className="font-semibold text-amber-900 underline">
            外泊届を確認する →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="プロフィール">
          <dl>
            <InfoRow label="氏名" value={student.kana ? `${student.name}(${student.kana})` : student.name} />
            <InfoRow label="学籍番号" value={student.student_number} />
            <InfoRow label="クラス" value={student.class_name ?? "—"} />
            <InfoRow label="寮部屋" value={student.dorm_room ?? "—"} />
            <InfoRow
              label="担当馬"
              value={horse ? `${horse.name}(馬房: ${horse.stall ?? student.stall_number ?? "—"})` : "未設定"}
            />
          </dl>
        </Section>

        <Section title="今日の出欠" action={<span className="text-xs text-gray-400">{today}</span>}>
          {todayAttendance ? (
            <div className="flex items-center gap-3 py-2">
              <Badge tone={ATTENDANCE_TONES[todayAttendance.status]}>
                {ATTENDANCE_STATUS_LABELS[todayAttendance.status]}
              </Badge>
              {todayAttendance.note && <span className="text-sm text-gray-600">{todayAttendance.note}</span>}
            </div>
          ) : (
            <p className="py-2 text-sm text-gray-400">本日の出欠はまだ記録されていません。</p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            出欠の詳細は{" "}
            <Link href="/student/attendance" className="font-medium text-brand-600 hover:underline">
              出欠履歴
            </Link>{" "}
            から確認できます。
          </p>
        </Section>
      </div>

      <SectionTitle>今月の出欠サマリ</SectionTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="出席" value={counts.present} tone="success" sub="今月" />
        <Stat label="欠席" value={counts.absent} tone="danger" sub="今月" />
        <Stat label="遅刻" value={counts.late} tone="warning" sub="今月" />
        <Stat label="早退" value={counts.early_leave} sub="今月" />
      </div>

      <SectionTitle>最新のお知らせ</SectionTitle>
      <Section>
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
          <Link href="/student/announcements" className="text-sm font-medium text-brand-600 hover:underline">
            すべて見る →
          </Link>
        </div>
      </Section>
    </div>
  );
}
