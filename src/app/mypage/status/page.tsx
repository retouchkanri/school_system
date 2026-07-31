import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import {
  PROGRESS_STEPS,
  statusIndex,
  completedStepCount,
  progressTitle,
} from "@/lib/constants";
import { Section, PageHeader, ProgressTracker, btnPrimary } from "@/components/ui";
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
          <div className="py-6 text-center">
            <p className="text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">
              まずは資料請求フォームからお申し込みください。
            </p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Section>
      </div>
    );
  }

  // lead.status は「完了した最新ステップ」を指すため、現在取り組むステップはその次
  const idx = statusIndex(lead.status);
  const done = completedStepCount(lead.status);
  const total = PROGRESS_STEPS.length;
  const remaining = PROGRESS_STEPS.filter((_, i) => {
    if (lead.status === "enrolled") return false;
    return i > idx;
  });
  const currentStep = lead.status === "enrolled" ? undefined : PROGRESS_STEPS[idx + 1];

  return (
    <div>
      <PageHeader
        title="現在の状態"
        description={`${done} / ${total} 完了 — 現在の進捗と残りのタスクを確認できます`}
      />

      <Section title={progressTitle(lead.status)} className="mb-6">
        <p className="mb-3 text-sm text-gray-600">
          各ステップをクリックすると、詳細説明が表示されます。
        </p>
        <ProgressTracker status={lead.status} />
      </Section>

      {currentStep && lead.status !== "enrolled" && (
        <Section title="現在のステップ" className="mb-6">
          <p className="text-base font-bold text-gray-900">{currentStep.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{currentStep.description}</p>
          {STEP_HREFS[currentStep.key] && (
            <Link href={STEP_HREFS[currentStep.key]!} className={`${btnPrimary} mt-4`}>
              このステップへ進む →
            </Link>
          )}
        </Section>
      )}

      <Section title={`残りのタスク（${remaining.length}件）`}>
        {remaining.length === 0 ? (
          <p className="text-sm text-gray-600">すべてのステップが完了しています。ご入学おめでとうございます。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {remaining.map((step, i) => {
              const isCurrent = i === 0;
              return (
                <li key={step.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{step.label}</span>
                      {isCurrent ? (
                        <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          現在
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                          未完了
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.description}</p>
                  </div>
                  {isCurrent && STEP_HREFS[step.key] && (
                    <Link
                      href={STEP_HREFS[step.key]!}
                      className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      進む →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
