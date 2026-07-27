import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { PRE_SCREENING_QUESTIONS, AI_JUDGEMENT_LABELS, AI_JUDGEMENT_MESSAGES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader, Badge, btnPrimary, type BadgeTone } from "@/components/ui";
import type { AiJudgement, PreScreeningSurvey } from "@/lib/types";
import SurveyForm from "./survey-form";

const JUDGEMENT_TONE: Record<AiJudgement, BadgeTone> = {
  approved: "green",
  caution: "amber",
  rejected: "purple",
};

export default async function SurveyPage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="入学仮審査アンケート" />
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

  const { data } = await adminDb()
    .from("pre_screening_surveys")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();
  const survey = (data as PreScreeningSurvey | null) ?? null;

  // 回答済み → 読み取り専用表示 + AI診断結果
  if (survey) {
    return (
      <div>
        <PageHeader
          title="入学仮審査アンケート"
          description="ご回答ありがとうございました"
          action={<Badge tone="green">回答済</Badge>}
        />

        {lead.ai_judgement && (
          <div className="mb-6 border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
            <p className="text-xs font-bold text-purple-600">入学仮審査結果</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={JUDGEMENT_TONE[lead.ai_judgement]}>{AI_JUDGEMENT_LABELS[lead.ai_judgement]}</Badge>
              {lead.ai_type && <span className="text-sm font-bold text-gray-700">{lead.ai_type}</span>}
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900">{AI_JUDGEMENT_MESSAGES[lead.ai_judgement]}</p>
            <p className="mt-3 text-xs text-gray-400">
              ※ こちらの診断は入学後のサポートに活用されます。合否そのものではなく、あなたに合ったご案内のための結果です。
            </p>
            <Link href="/mypage/events" className={`${btnPrimary} mt-4`}>
              見学・オープンキャンパス予約へ進む →
            </Link>
          </div>
        )}

        <Card title={`ご回答内容 (${fmtDateTime(survey.submitted_at)} 送信)`}>
          <div className="space-y-4">
            {PRE_SCREENING_QUESTIONS.map((q, i) => (
              <div key={q.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <p className="text-xs font-semibold text-gray-500">
                  Q{i + 1}. {q.text}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {survey.answers[q.id]?.trim() || "—"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="入学仮審査アンケート"
        description="あなたに合った学校生活をご提案するため、まずは入学仮審査アンケートにご協力をお願いします。ありのままお答えください。"
      />
      <SurveyForm />
    </div>
  );
}
