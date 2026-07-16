import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Card, PageHeader, Badge, EmptyState, InfoRow, btnPrimary } from "@/components/ui";
import type { AdmissionDecision, Announcement, EnrollmentProcedure, Horse, Student } from "@/lib/types";

export default async function EnrolleePage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="入学者専用ページ" />
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

  const [{ data: decisionData }, { data: procedureData }] = await Promise.all([
    adminDb().from("admission_decisions").select("*").eq("lead_id", lead.id).maybeSingle(),
    adminDb().from("enrollment_procedures").select("*").eq("lead_id", lead.id).maybeSingle(),
  ]);
  const decision = (decisionData as AdmissionDecision | null) ?? null;
  const procedure = (procedureData as EnrollmentProcedure | null) ?? null;

  const isAccepted = !!decision && decision.result === "accepted" && !!decision.notified_at;
  const procedureStarted = !!procedure && procedure.status !== "not_started";

  // 合格 + 入学手続き着手済みのみ閲覧可
  if (!isAccepted || !procedureStarted) {
    return (
      <div>
        <PageHeader title="入学者専用ページ" />
        <Card>
          <div className="py-6 text-center">
            <p className="text-3xl">🌸</p>
            <p className="mt-3 text-sm font-bold text-gray-800">
              このページは合格後、入学手続きを開始された方専用です
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {!isAccepted
                ? "選考結果は合否確認ページでご確認ください。合格された方は入学手続きの開始後にご覧いただけます。"
                : "入学手続きページで手続きを開始すると、こちらのページをご覧いただけます。"}
            </p>
            <Link href={!isAccepted ? "/mypage/result" : "/mypage/enrollment"} className={`${btnPrimary} mt-5`}>
              {!isAccepted ? "合否確認ページへ →" : "入学手続きへ進む →"}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const [{ data: announcementsData }, { data: studentData }] = await Promise.all([
    adminDb()
      .from("announcements")
      .select("*")
      .in("audience", ["enrollee", "all"])
      .order("published_at", { ascending: false }),
    adminDb().from("students").select("*").eq("lead_id", lead.id).maybeSingle(),
  ]);
  const announcements = ((announcementsData as Announcement[] | null) ?? []).slice();
  const student = (studentData as Student | null) ?? null;

  let horse: Horse | null = null;
  if (student?.assigned_horse_id) {
    const { data: horseData } = await adminDb()
      .from("horses")
      .select("*")
      .eq("id", student.assigned_horse_id)
      .maybeSingle();
    horse = (horseData as Horse | null) ?? null;
  }

  const placeholder = <span className="text-gray-400">入学式当日に発表します</span>;

  return (
    <div>
      <PageHeader
        title="入学者専用ページ"
        description={`${lead.name}さん、ご入学おめでとうございます。学院からのお知らせをご確認ください。`}
      />

      <div className="mb-6 rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-brand-50 p-6 shadow-sm">
        <p className="text-xs font-bold text-pink-600">🌸 あなたの入学情報</p>
        <dl className="mt-3">
          <InfoRow label="お名前" value={lead.name} />
          <InfoRow label="合格した課程" value={lead.desired_course ?? "—"} />
          <InfoRow
            label="入学式のご案内"
            value={<span className="text-gray-600">下記のお知らせをご確認ください</span>}
          />
          <InfoRow label="クラス" value={student?.class_name ?? placeholder} />
          <InfoRow label="寮のお部屋" value={student?.dorm_room ?? placeholder} />
          <InfoRow label="担当馬" value={horse ? `${horse.name}号` : placeholder} />
          {student && <InfoRow label="学籍番号" value={student.student_number} />}
        </dl>
        {!student && (
          <p className="mt-3 text-xs text-gray-400">
            ※ クラス・寮・担当馬は入学式当日に発表します。楽しみにお待ちください。
          </p>
        )}
      </div>

      <h2 className="mb-3 text-base font-bold text-gray-800">学院からのお知らせ</h2>
      {announcements.length === 0 ? (
        <EmptyState message="現在お知らせはありません。入学式のご案内などが届き次第、こちらに表示されます。" />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900">{a.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge tone={a.audience === "enrollee" ? "brand" : "gray"}>
                    {a.audience === "enrollee" ? "入学決定者向け" : "全体"}
                  </Badge>
                  <span className="text-xs text-gray-400">{fmtDate(a.published_at)}</span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{a.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
