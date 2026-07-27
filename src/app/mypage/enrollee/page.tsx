import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { isDevPhase } from "@/lib/dev";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { KOUTOU_IMAGES, KOUTOU_DETAIL, SENMON_IMAGES } from "@/lib/site-images";
import { Card, PageHeader, Badge, EmptyState, InfoRow, btnPrimary } from "@/components/ui";
import type { AdmissionDecision, Announcement, EnrollmentProcedure, Horse, Student } from "@/lib/types";

function InfoSection({
  image,
  alt,
  title,
  content,
}: {
  image: string;
  alt: string;
  title: string;
  content: string | null;
}) {
  return (
    <div className="overflow-hidden border border-gray-200 bg-white shadow-sm sm:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt} className="h-36 w-full object-cover sm:h-auto sm:w-40 sm:shrink-0" />
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {content ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{content}</p>
        ) : (
          <p className="mt-2 text-sm text-gray-400">追ってご案内いたします。</p>
        )}
      </div>
    </div>
  );
}

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

  const bypass = isDevPhase();
  const isAccepted = !!decision && decision.result === "accepted" && !!decision.notified_at;
  const procedureStarted = !!procedure && procedure.status !== "not_started";
  const canView = isAccepted && procedureStarted;

  // 合格 + 入学手続き着手済みのみ閲覧可 (開発中はスキップ可)
  if (!canView && !bypass) {
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/visual-7.jpg"
        alt="馬と未来を見つめること。"
        className="mb-6 h-36 w-full rounded-xl object-cover sm:h-48"
      />
      <PageHeader
        title="入学者専用ページ"
        description={`${lead.name}さん、ご入学おめでとうございます。学院からのお知らせをご確認ください。`}
      />

      {bypass && !canView && (
        <div className="mb-6 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          開発モード: 選考結果・入学手続きの状態に関わらず入学者専用ページを確認できます
        </div>
      )}

      <div className="mb-6 border border-pink-200 bg-pink-50/60 p-6 shadow-sm">
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

      <h2 className="mb-3 text-base font-bold text-gray-800">入学に向けたご案内</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection
          image={KOUTOU_DETAIL.tokucho1.src}
          alt={KOUTOU_DETAIL.tokucho1.alt}
          title="オリエンテーション情報"
          content={student?.orientation_info ?? null}
        />
        <InfoSection
          image={KOUTOU_IMAGES.campus2.src}
          alt={KOUTOU_IMAGES.campus2.alt}
          title="持ち物"
          content={student?.items_to_bring ?? null}
        />
        <InfoSection
          image={KOUTOU_DETAIL.shisetsuDorm.src}
          alt={KOUTOU_DETAIL.shisetsuDorm.alt}
          title="寮情報"
          content={
            [student?.dorm_room ? `お部屋: ${student.dorm_room}` : null, student?.dorm_info ?? null]
              .filter(Boolean)
              .join("\n") || null
          }
        />
        <InfoSection
          image={KOUTOU_DETAIL.shisetsuKyusha.src}
          alt={KOUTOU_DETAIL.shisetsuKyusha.alt}
          title="配属馬房"
          content={student?.stall_number ?? null}
        />
        <InfoSection
          image={SENMON_IMAGES.tokuchoTanto.src}
          alt={SENMON_IMAGES.tokuchoTanto.alt}
          title="担当馬"
          content={horse ? `${horse.name}号` : null}
        />
        <InfoSection
          image={KOUTOU_DETAIL.shisetsuKosha.src}
          alt={KOUTOU_DETAIL.shisetsuKosha.alt}
          title="クラス発表"
          content={student?.class_name ?? null}
        />
        <InfoSection
          image={KOUTOU_IMAGES.riding1.src}
          alt={KOUTOU_IMAGES.riding1.alt}
          title="授業スケジュール"
          content={student?.class_schedule ?? null}
        />
        <InfoSection
          image={KOUTOU_IMAGES.campus3.src}
          alt={KOUTOU_IMAGES.campus3.alt}
          title="制服発送状況"
          content={student?.uniform_status ?? null}
        />
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
