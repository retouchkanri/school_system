import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Card, PageHeader, EmptyState, SectionTitle } from "@/components/ui";
import { COMPETENCY_CATEGORIES } from "@/lib/constants";
import type { CompetencyAssessment } from "@/lib/types";

export default async function StudentCompetencyPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="社会人基礎力チェック" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("competency_assessments")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  const assessments = (data ?? []) as CompetencyAssessment[];

  return (
    <div>
      <PageHeader
        title="社会人基礎力チェック"
        description="半年に一度、先生があなたの成長度合いを評価します"
      />

      {assessments.length === 0 ? (
        <Card>
          <EmptyState message="評価記録はまだありません" />
        </Card>
      ) : (
        assessments.map((a) => (
          <Card key={a.id} title={a.term} className="mb-6">
            <p className="mb-3 text-xs text-gray-400">評価日: {fmtDate(a.created_at)}</p>
            <div className="space-y-4">
              {COMPETENCY_CATEGORIES.map((group) => (
                <div key={group.group}>
                  <p className="mb-2 text-xs font-bold text-gray-500">{group.group}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.keys.map((key) => {
                      const score = a.scores[key];
                      return (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                          <span className="text-sm text-gray-700">{key}</span>
                          <span className="text-sm font-bold text-brand-700">{score != null ? `${score} / 5` : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {a.growth_comment && (
              <div className="mt-4">
                <SectionTitle>成長したところ</SectionTitle>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{a.growth_comment}</p>
              </div>
            )}
            {a.overall_comment && (
              <div className="mt-4">
                <SectionTitle>総評</SectionTitle>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{a.overall_comment}</p>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
