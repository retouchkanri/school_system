import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, type BadgeTone } from "@/components/ui";
import type { Student, TrainingRecord } from "@/lib/types";
import TrainingForm, { type StudentOption } from "./training-form";

const CATEGORY_TONES: Record<string, BadgeTone> = {
  校外研修: "blue",
  資格: "purple",
  講習: "amber",
  実習: "green",
};

type TrainingRow = TrainingRecord & { student: Pick<Student, "id" | "name"> | null };

export default async function TrainingsPage() {
  await requireRole("admin");
  const db = adminDb();
  const [{ data: trainingsData }, { data: studentsData }] = await Promise.all([
    db
      .from("training_records")
      .select("*, student:students(id, name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
  ]);

  const trainings = (trainingsData ?? []) as TrainingRow[];
  const students = (studentsData ?? []) as Student[];
  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));

  return (
    <div>
      <PageHeader title="研修管理" description="校外研修・資格・講習・実習の受講記録を管理します" />

      <Card title="新規研修の登録" className="mb-6">
        <TrainingForm students={studentOptions} defaultDate={toDateInput()} />
      </Card>

      <h2 className="mb-3 text-base font-bold text-gray-800">研修記録一覧 (新しい順50件)</h2>
      {trainings.length === 0 ? (
        <EmptyState message="研修記録はまだありません" />
      ) : (
        <Table headers={["日付", "生徒", "研修名", "カテゴリ", "結果", "担当講師", "備考"]}>
          {trainings.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(t.date)}</Td>
              <Td className="whitespace-nowrap">
                {t.student ? (
                  <Link href={`/admin/students/${t.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {t.student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="font-medium text-gray-800">{t.title}</Td>
              <Td>
                {t.category ? <Badge tone={CATEGORY_TONES[t.category] ?? "gray"}>{t.category}</Badge> : "—"}
              </Td>
              <Td className="text-gray-700">{t.result ?? "—"}</Td>
              <Td className="text-gray-700">{t.instructor ?? "—"}</Td>
              <Td className="max-w-60">
                {t.notes ? (
                  <p className="line-clamp-2 text-gray-600" title={t.notes}>
                    {t.notes}
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
