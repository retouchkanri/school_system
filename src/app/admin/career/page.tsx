import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, StatCard, type BadgeTone } from "@/components/ui";
import { CAREER_OUTCOME_LABELS } from "@/lib/constants";
import type { Student, CareerRecord, CareerOutcomeType } from "@/lib/types";
import CareerForm, { type StudentOption } from "./career-form";

type CareerRow = CareerRecord & { student: Pick<Student, "id" | "name"> | null };

const OUTCOME_TONES: Record<CareerOutcomeType, BadgeTone> = {
  employment: "green",
  further_education: "blue",
  other: "gray",
};

export default async function AdminCareerPage() {
  const db = adminDb();

  const [{ data: recordsData }, { data: studentsData }] = await Promise.all([
    db
      .from("career_records")
      .select("*, student:students(id, name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("students").select("*").order("student_number", { ascending: true }),
  ]);

  const records = (recordsData ?? []) as CareerRow[];
  const students = (studentsData ?? []) as Student[];
  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));

  const employedCount = records.filter((r) => r.outcome_type === "employment").length;
  const furtherEducationCount = records.filter((r) => r.outcome_type === "further_education").length;

  return (
    <div>
      <PageHeader title="進路管理" description="卒業生・在校生の就職・進学先を記録します" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="記録件数" value={records.length} />
        <StatCard label="就職" value={employedCount} tone="success" />
        <StatCard label="進学" value={furtherEducationCount} />
      </div>

      <Card title="新規進路の登録" className="mb-6">
        <CareerForm students={studentOptions} />
      </Card>

      <h2 className="mb-4 text-base font-bold text-gray-800">進路一覧 (新しい順50件)</h2>
      {records.length === 0 ? (
        <EmptyState message="進路記録はまだありません" />
      ) : (
        <Table headers={["生徒", "区分", "就職先・進学先", "職種・コース", "決定日", "備考"]}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap">
                {r.student ? (
                  <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {r.student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <Badge tone={OUTCOME_TONES[r.outcome_type]}>{CAREER_OUTCOME_LABELS[r.outcome_type]}</Badge>
              </Td>
              <Td className="font-medium text-gray-800">{r.organization}</Td>
              <Td className="text-gray-600">{r.position ?? "—"}</Td>
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.decided_date)}</Td>
              <Td className="max-w-56">
                {r.notes ? (
                  <p className="line-clamp-2 whitespace-pre-wrap text-gray-600" title={r.notes}>
                    {r.notes}
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
