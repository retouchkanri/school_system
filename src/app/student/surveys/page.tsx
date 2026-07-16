import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import type { StudentSurvey, StudentSurveyResponse } from "@/lib/types";
import SurveyAnswerForm from "./survey-answer-form";

export default async function StudentSurveysPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="定期アンケート" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const db = adminDb();
  const { data: surveyData } = await db
    .from("student_surveys")
    .select("*")
    .eq("active", true)
    .eq("target", "students")
    .order("created_at", { ascending: false });

  const surveys = (surveyData ?? []) as StudentSurvey[];

  let responses: StudentSurveyResponse[] = [];
  if (surveys.length > 0) {
    const { data: responseData } = await db
      .from("student_survey_responses")
      .select("*")
      .eq("student_id", student.id)
      .in(
        "survey_id",
        surveys.map((s) => s.id)
      );
    responses = (responseData ?? []) as StudentSurveyResponse[];
  }
  const responseBySurvey = new Map(responses.map((r) => [r.survey_id, r]));

  return (
    <div>
      <PageHeader title="定期アンケート" description="学校生活についてのアンケートにご回答ください" />

      {surveys.length === 0 ? (
        <Card>
          <EmptyState message="現在回答できるアンケートはありません" />
        </Card>
      ) : (
        <div className="space-y-6">
          {surveys.map((survey) => {
            const response = responseBySurvey.get(survey.id);
            return (
              <Card
                key={survey.id}
                title={survey.title}
                action={
                  response ? <Badge tone="green">回答済</Badge> : <Badge tone="amber">未回答</Badge>
                }
              >
                {survey.description && <p className="mb-4 text-sm text-gray-500">{survey.description}</p>}
                {response ? (
                  <div>
                    <dl>
                      {(survey.questions ?? []).map((q, i) => (
                        <div key={q.id} className="border-b border-gray-50 py-2 last:border-0">
                          <dt className="text-xs font-semibold text-gray-500">{`Q${i + 1}. ${q.text}`}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                            {response.answers[q.id] ?? "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-xs text-gray-400">回答日時: {fmtDateTime(response.submitted_at)}</p>
                  </div>
                ) : (
                  <SurveyAnswerForm surveyId={survey.id} questions={survey.questions ?? []} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
