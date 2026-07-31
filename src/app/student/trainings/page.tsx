import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { Section, PageHeader, EmptyState, Badge, SimpleTable, Td } from "@/components/ui";
import type { TrainingRecord } from "@/lib/types";

export default async function StudentTrainingsPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="研修履歴" />
        <Section>
          <EmptyState message="生徒情報が登録されていません。学校までお問い合わせください。" />
        </Section>
      </div>
    );
  }

  const { data } = await adminDb()
    .from("training_records")
    .select("*")
    .eq("student_id", student.id)
    .order("date", { ascending: false });

  const records = (data ?? []) as TrainingRecord[];

  return (
    <div>
      <PageHeader title="研修履歴" description="校外研修・資格取得・実習などの記録です" />

      {records.length === 0 ? (
        <Section>
          <EmptyState message="研修記録はまだありません" />
        </Section>
      ) : (
        <SimpleTable headers={["日付", "研修名", "区分", "結果", "講師", "備考"]}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-700">{fmtDate(r.date)}</Td>
              <Td className="font-medium text-gray-800">{r.title}</Td>
              <Td>{r.category ? <Badge tone="blue">{r.category}</Badge> : "—"}</Td>
              <Td className="text-gray-700">{r.result ?? "—"}</Td>
              <Td className="whitespace-nowrap text-gray-600">{r.instructor ?? "—"}</Td>
              <Td className="max-w-[16rem]">
                <p className="whitespace-pre-wrap text-gray-600">{r.notes ?? "—"}</p>
              </Td>
            </tr>
          ))}
        </SimpleTable>
      )}
    </div>
  );
}
