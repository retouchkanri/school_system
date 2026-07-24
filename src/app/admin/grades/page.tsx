import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, btnSecondary } from "@/components/ui";
import type { Student, GradeRecord } from "@/lib/types";
import GradeForm, { type StudentOption } from "./grade-form";

type GradeRow = GradeRecord & { student: Pick<Student, "id" | "name"> | null };

export default async function AdminGradesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const studentFilter = sp.student ?? "";

  const db = adminDb();
  let query = db
    .from("grade_records")
    .select("*, student:students(id, name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (studentFilter) query = query.eq("student_id", studentFilter);

  const [{ data: gradesData }, { data: studentsData }] = await Promise.all([
    query,
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
  ]);

  const grades = (gradesData ?? []) as GradeRow[];
  const students = (studentsData ?? []) as Student[];
  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));

  return (
    <div>
      <PageHeader title="成績管理" description="先生が科目ごとの成績・評価を記載します" />

      <Card title="新規成績の登録" className="mb-6">
        <GradeForm students={studentOptions} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">成績一覧 (新しい順50件)</h2>
        <form method="get" className="flex items-center gap-2">
          <select
            name="student"
            defaultValue={studentFilter}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">全ての生徒</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.student_number})
              </option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>
            絞り込み
          </button>
        </form>
      </div>

      {grades.length === 0 ? (
        <EmptyState message="成績記録はまだありません" />
      ) : (
        <Table headers={["記録日", "生徒", "学期", "科目", "点数", "評価", "コメント"]}>
          {grades.map((g) => (
            <tr key={g.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(g.created_at)}</Td>
              <Td className="whitespace-nowrap">
                {g.student ? (
                  <Link href={`/admin/students/${g.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {g.student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap text-gray-600">{g.term}</Td>
              <Td className="whitespace-nowrap font-medium text-gray-800">{g.subject}</Td>
              <Td className="whitespace-nowrap text-gray-700">{g.score != null ? `${g.score}点` : "—"}</Td>
              <Td>{g.evaluation ? <Badge tone="blue">{g.evaluation}</Badge> : "—"}</Td>
              <Td className="max-w-72">
                {g.comment ? (
                  <p className="line-clamp-2 whitespace-pre-wrap text-gray-600" title={g.comment}>
                    {g.comment}
                  </p>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
