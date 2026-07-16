import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { Card, PageHeader, btnPrimary } from "@/components/ui";
import type { ExperienceSurvey } from "@/lib/types";
import ExperienceForms from "./experience-form";

export default async function ExperiencePage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="体験終了アンケート" />
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

  // 体験参加済みが回答条件
  const { data: attended } = await adminDb()
    .from("open_campus_bookings")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "attended")
    .limit(1)
    .maybeSingle();

  if (!attended) {
    return (
      <div>
        <PageHeader title="体験終了アンケート" />
        <Card>
          <div className="py-6 text-center">
            <p className="text-3xl">🏫</p>
            <p className="mt-3 text-sm font-bold text-gray-800">体験参加後にご回答いただけます</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              このアンケートは見学・オープンキャンパスにご参加いただいた後にお答えいただくものです。
              まだご予約がお済みでない方は、見学予約ページからお申し込みください。
            </p>
            <Link href="/mypage/events" className={`${btnPrimary} mt-5`}>
              見学・オープンキャンパス予約へ →
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { data: surveysData } = await adminDb().from("experience_surveys").select("*").eq("lead_id", lead.id);
  const surveys = ((surveysData as ExperienceSurvey[] | null) ?? []).slice();
  const studentAnswers = surveys.find((s) => s.respondent === "student")?.answers ?? null;
  const parentAnswers = surveys.find((s) => s.respondent === "parent")?.answers ?? null;
  const bothDone = !!studentAnswers && !!parentAnswers;

  return (
    <div>
      <PageHeader
        title="体験終了アンケート"
        description="体験へのご参加ありがとうございました。ご本人用・保護者用の2つのアンケートにご協力ください。"
      />

      {bothDone && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-bold text-emerald-800">✓ 両方のアンケートにご回答いただきました。ありがとうございました🎉</p>
          <p className="mt-1 text-sm text-emerald-700">入学をご希望の方は出願にお進みください。</p>
          <Link href="/mypage/application" className={`${btnPrimary} mt-4`}>
            出願へ進む →
          </Link>
        </div>
      )}

      <ExperienceForms studentAnswers={studentAnswers} parentAnswers={parentAnswers} />
    </div>
  );
}
