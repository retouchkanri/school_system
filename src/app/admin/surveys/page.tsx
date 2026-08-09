import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState, btnSmall } from "@/components/ui";
import type { Student, StudentSurvey, StudentSurveyResponse } from "@/lib/types";
import SurveyForm from "./survey-form";
import { toggleSurveyActive, deliverSurvey } from "./actions";

const TARGET_LABELS: Record<string, string> = {
  students: "在校生",
  parents: "保護者",
};

type ResponseRow = StudentSurveyResponse & { student: Pick<Student, "id" | "name"> | null };

export default async function SurveysPage() {
  await requireRole("admin");
  const db = adminDb();
  const [{ data: surveysData }, { data: responsesData }, { count: studentCount }] = await Promise.all([
    db.from("student_surveys").select("*").order("created_at", { ascending: false }),
    db
      .from("student_survey_responses")
      .select("*, student:students(id, name)")
      .order("submitted_at", { ascending: false }),
    db.from("students").select("*", { count: "exact", head: true }).eq("status", "enrolled"),
  ]);

  const surveys = (surveysData ?? []) as StudentSurvey[];
  const responses = (responsesData ?? []) as ResponseRow[];
  const totalStudents = studentCount ?? 0;

  const responsesBySurvey = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const list = responsesBySurvey.get(r.survey_id) ?? [];
    list.push(r);
    responsesBySurvey.set(r.survey_id, list);
  }

  return (
    <div>
      <PageHeader title="定期アンケート" description="在校生・保護者向けの定期アンケートを作成し、回答状況を確認します" />

      <Card title="新規アンケート作成" className="mb-6">
        <SurveyForm />
      </Card>

      <h2 className="mb-3 text-base font-bold text-gray-800">アンケート一覧</h2>
      {surveys.length === 0 ? (
        <EmptyState message="アンケートはまだありません" />
      ) : (
        <div className="space-y-6">
          {surveys.map((survey) => {
            const surveyResponses = responsesBySurvey.get(survey.id) ?? [];
            return (
              <Card
                key={survey.id}
                title={survey.title}
                action={
                  <div className="flex items-center gap-2">
                    <Badge tone={survey.target === "parents" ? "purple" : "blue"}>
                      {TARGET_LABELS[survey.target] ?? survey.target}
                    </Badge>
                    {survey.active ? <Badge tone="green">受付中</Badge> : <Badge tone="gray">終了</Badge>}
                  </div>
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    {survey.description && <p className="text-sm text-gray-600">{survey.description}</p>}
                    <p className="mt-1 text-xs text-gray-400">作成日: {fmtDate(survey.created_at)}</p>
                    <p className="mt-2 text-sm text-gray-800">
                      回答状況:{" "}
                      <span className="text-lg font-bold text-brand-700">{surveyResponses.length}</span>
                      <span className="text-gray-500"> / {totalStudents}名 (在籍生徒数)</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={deliverSurvey}>
                      <input type="hidden" name="id" value={survey.id} />
                      <button
                        type="submit"
                        disabled={!survey.active}
                        title={survey.active ? "対象者へ回答依頼 (メール/LINE) を送ります" : "終了したアンケートは配信できません"}
                        className={btnSmall}
                      >
                       配信する
                      </button>
                    </form>
                    <form action={toggleSurveyActive}>
                      <input type="hidden" name="id" value={survey.id} />
                      <input type="hidden" name="next" value={survey.active ? "false" : "true"} />
                      <button type="submit" className={btnSmall}>
                        {survey.active ? "受付終了にする" : "受付を再開する"}
                      </button>
                    </form>
                  </div>
                </div>

                <details className="mt-4 border border-gray-200">
                  <summary className="cursor-pointer select-none rounded-lg bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    回答一覧を表示 ({surveyResponses.length}件)
                  </summary>
                  <div className="space-y-4 p-4">
                    {surveyResponses.length === 0 ? (
                      <EmptyState message="まだ回答がありません" />
                    ) : (
                      surveyResponses.map((res) => (
                        <div key={res.id} className="border border-gray-100 bg-gray-50 p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-gray-800">{res.student?.name ?? "不明な生徒"}</p>
                            <p className="text-xs text-gray-400">{fmtDateTime(res.submitted_at)}</p>
                          </div>
                          <dl className="space-y-2">
                            {survey.questions.map((q) => (
                              <div key={q.id}>
                                <dt className="text-xs font-semibold text-gray-500">{q.text}</dt>
                                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">
                                  {res.answers[q.id]?.trim() ? res.answers[q.id] : <span className="text-gray-400">未回答</span>}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
