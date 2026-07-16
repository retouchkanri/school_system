import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { PRE_SCREENING_QUESTIONS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader, Badge, btnPrimary } from "@/components/ui";
import type { PreScreeningSurvey } from "@/lib/types";
import SurveyForm from "./survey-form";

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

        {lead.ai_type && (
          <div className="mb-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-brand-50 p-6 shadow-sm">
            <p className="text-xs font-bold text-purple-600">AI診断結果</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              あなたのタイプ: <span className="text-purple-700">{lead.ai_type}</span>
            </p>
            {lead.ai_summary && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{lead.ai_summary}</p>
            )}
            <p className="mt-3 text-xs text-gray-400">
              ※ この診断は入学後のサポートに活用されます。あなたの良さを大切にした学院生活をご提案します。
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
        description="全16問・約5分。あなたに合ったサポートをご提案するためのアンケートです。ありのままお答えください。"
      />
      <SurveyForm />
    </div>
  );
}
