import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PageHeader, Card, EmptyState, SectionTitle } from "@/components/ui";
import type { Student, CompetencyAssessment } from "@/lib/types";
import CompetencyForm, { type StudentOption } from "./competency-form";

type AssessmentRow = CompetencyAssessment & { student: Pick<Student, "id" | "name"> | null };

function averageScore(scores: Record<string, number>): string {
  const values = Object.values(scores);
  if (values.length === 0) return "—";
  return (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
}

export default async function AdminCompetencyPage() {
  const db = adminDb();

  const [{ data: assessmentsData }, { data: studentsData }] = await Promise.all([
    db
      .from("competency_assessments")
      .select("*, student:students(id, name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
  ]);

  const assessments = (assessmentsData ?? []) as AssessmentRow[];
  const students = (studentsData ?? []) as Student[];
  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));

  return (
    <div>
      <PageHeader
        title="社会人基礎力評価"
        description="半年に一度、生徒の成長度合いを評価します (経済産業省「社会人基礎力」の12要素)"
      />

      <Card title="評価の登録・更新" className="mb-6">
        <CompetencyForm students={studentOptions} />
      </Card>

      <SectionTitle>評価一覧 (新しい順50件)</SectionTitle>
      {assessments.length === 0 ? (
        <EmptyState message="評価記録はまだありません" />
      ) : (
        <ul className="space-y-3">
          {assessments.map((a) => (
            <li key={a.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {a.student ? (
                    <Link href={`/admin/students/${a.student.id}`} className="font-semibold text-brand-700 hover:underline">
                      {a.student.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-800">—</span>
                  )}
                  <span className="text-xs text-gray-500">{a.term}</span>
                </div>
                <span className="text-xs text-gray-400">{fmtDate(a.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                平均スコア: <span className="font-bold text-brand-700">{averageScore(a.scores)}</span> / 5
              </p>
              {a.growth_comment && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">成長: {a.growth_comment}</p>
              )}
              {a.overall_comment && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500">総評: {a.overall_comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
