import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Section, PageHeader, EmptyState, Badge, SimpleTable, Td, SectionTitle } from "@/components/ui";
import type { GradeRecord } from "@/lib/types";

export default async function ParentGradesPage() {
  const profile = await requireRole("parent");
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="お子様の成績表" />
        <Section>
          <EmptyState message="お子様の生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("grade_records")
    .select("*")
    .in(
      "student_id",
      students.map((s) => s.id)
    )
    .order("created_at", { ascending: false });

  const records = (data ?? []) as GradeRecord[];

  return (
    <div>
      <PageHeader title="お子様の成績表" description="先生が記載した科目ごとの成績・評価です" />

      {students.map((student) => {
        const own = records.filter((r) => r.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})
            </SectionTitle>
            {own.length === 0 ? (
              <Section>
                <EmptyState message="成績記録はまだありません" />
              </Section>
            ) : (
              <SimpleTable headers={["記録日", "学期", "科目", "点数", "評価", "コメント"]}>
                {own.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.created_at)}</Td>
                    <Td className="whitespace-nowrap text-gray-600">{r.term}</Td>
                    <Td className="font-medium text-gray-800">{r.subject}</Td>
                    <Td className="whitespace-nowrap text-gray-700">{r.score != null ? `${r.score}点` : "—"}</Td>
                    <Td>{r.evaluation ? <Badge tone="blue">{r.evaluation}</Badge> : "—"}</Td>
                    <Td className="max-w-[16rem]">
                      <p className="whitespace-pre-wrap text-gray-600">{r.comment ?? "—"}</p>
                    </Td>
                  </tr>
                ))}
              </SimpleTable>
            )}
          </div>
        );
      })}
    </div>
  );
}
