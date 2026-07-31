import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Section, PageHeader, EmptyState, SectionTitle } from "@/components/ui";
import { COMPETENCY_CATEGORIES } from "@/lib/constants";
import type { CompetencyAssessment } from "@/lib/types";

export default async function ParentCompetencyPage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="お子様の社会人基礎力チェック" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("competency_assessments")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .order("created_at", { ascending: false });

  const assessments = (data ?? []) as CompetencyAssessment[];

  return (
    <div>
      <PageHeader title="お子様の社会人基礎力チェック" description="半年に一度の成長度合いの評価です" />

      {students.map((student) => {
        const own = assessments.filter((a) => a.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})
            </SectionTitle>
            {own.length === 0 ? (
              <Section>
                <EmptyState message="評価記録はまだありません" />
              </Section>
            ) : (
              own.map((a) => (
                <Section key={a.id} title={a.term} className="mb-4">
                  <p className="mb-3 text-xs text-gray-400">評価日: {fmtDate(a.created_at)}</p>
                  <div className="space-y-4">
                    {COMPETENCY_CATEGORIES.map((group) => (
                      <div key={group.group}>
                        <p className="mb-2 text-xs font-bold text-gray-500">{group.group}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {group.keys.map((key) => {
                            const score = a.scores[key];
                            return (
                              <div key={key} className="flex items-center justify-between border border-gray-100 bg-gray-50 px-3 py-2">
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
                </Section>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
