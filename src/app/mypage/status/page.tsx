import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { PROGRESS_STEPS, PROGRESS_GROUPS, statusIndex, completedStepCount } from "@/lib/constants";
import { Section, PageHeader, btnPrimary } from "@/components/ui";
import StatusGroups from "./status-groups";
import type { LeadStatus } from "@/lib/types";

/** 各ステップの作業ページへのリンク */
const STEP_HREFS: Partial<Record<LeadStatus, string>> = {
  material_requested: "/request",
  material_sent: "/mypage/video",
  video_watched: "/mypage/video",
  survey_answered: "/mypage/survey",
  ai_judged: "/mypage/events",
  visit_reserved: "/mypage/events",
  payment_confirmed: "/mypage/events",
  visit_attended: "/mypage/experience",
  exp_survey_answered: "/mypage/experience",
  applied: "/mypage/application",
  aptitude_done: "/mypage/aptitude",
  interview: "/mypage/application",
  decision_sent: "/mypage/result",
  enrollment_procedure: "/mypage/enrollment",
  admission_fee_paid: "/mypage/enrollment",
  uniform_ordered: "/mypage/enrollment",
  dorm_ready: "/mypage/enrollee",
  enrolled: "/mypage/enrollee",
};

export default async function MyStatusPage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="現在の状態" description="入学までの進捗を確認できます" />
        <Section>
          <div className="rounded-lg border border-gray-200 bg-white py-10 text-center">
            <p className="text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Section>
      </div>
    );
  }

  // lead.status は「完了した最新ステップ」を指すため、いま取り組むステップはその次
  const idx = statusIndex(lead.status);
  const done = completedStepCount(lead.status);
  const total = PROGRESS_STEPS.length;
  const currentStep = lead.status === "enrolled" ? undefined : PROGRESS_STEPS[idx + 1];
  const currentHref = currentStep ? STEP_HREFS[currentStep.key] : undefined;

  return (
    <div>
      <PageHeader
        title="現在の状態"
        description={`入学までの全${total}ステップのうち ${done} ステップが完了しています`}
      />

      {currentStep ? (
        <Section title="いま取り組むステップ" className="mb-6">
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-xs font-bold text-brand-600">
              {idx + 2} / {total}
            </p>
            <p className="mt-1 text-base font-bold text-gray-900">{currentStep.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{currentStep.description}</p>
            {currentHref && (
              <Link href={currentHref} className={`${btnPrimary} mt-4`}>
                このステップへ進む →
              </Link>
            )}
          </div>
        </Section>
      ) : (
        <Section className="mb-6">
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-base font-bold text-gray-900">すべてのステップが完了しています</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              ご入学おめでとうございます。入学後のご案内は入学者専用ページからご確認いただけます。
            </p>
            <Link href="/mypage/enrollee" className={`${btnPrimary} mt-4`}>
              入学者専用ページへ →
            </Link>
          </div>
        </Section>
      )}

      <Section title={`入学までの${total}ステップ（${PROGRESS_GROUPS.length}つの章）`}>
        <p className="mb-3 text-sm text-gray-600">
          章の見出しをクリックすると、その章に含まれるステップの一覧が開きます。
          左に各ステップのご案内、右に現在の状態を表示しています。
        </p>
        <StatusGroups status={lead.status} stepHrefs={STEP_HREFS} />
      </Section>
    </div>
  );
}
