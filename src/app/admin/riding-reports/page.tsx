import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, btnSecondary } from "@/components/ui";
import type { Student, Horse, RidingReport } from "@/lib/types";
import ReportForm, { type StudentOption, type HorseOption } from "./report-form";

type ReportRow = RidingReport & {
  student: Pick<Student, "id" | "name"> | null;
  horse: Pick<Horse, "id" | "name" | "is_retouch"> | null;
};

export default async function RidingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ horse?: string }>;
}) {
  const sp = await searchParams;
  const horseFilter = sp.horse ?? "";

  const db = adminDb();
  let query = db
    .from("riding_reports")
    .select("*, student:students(id, name), horse:horses(id, name, is_retouch)")
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (horseFilter) query = query.eq("horse_id", horseFilter);

  const [{ data: reportsData }, { data: studentsData }, { data: horsesData }] = await Promise.all([
    query,
    db.from("students").select("*").eq("status", "enrolled").order("student_number", { ascending: true }),
    db.from("horses").select("*").order("name", { ascending: true }),
  ]);

  const reports = (reportsData ?? []) as ReportRow[];
  const students = (studentsData ?? []) as Student[];
  const horses = (horsesData ?? []) as Horse[];

  const studentOptions: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
  }));
  const horseOptions: HorseOption[] = horses.map((h) => ({ id: h.id, name: h.name, is_retouch: h.is_retouch }));

  return (
    <div>
      <PageHeader title="騎乗報告 (授業日報)" description="日々の騎乗内容と馬の状態を記録します" />

      <Card title="新規報告の登録" className="mb-6">
        <ReportForm students={studentOptions} horses={horseOptions} defaultDate={toDateInput()} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">報告一覧 (新しい順30件)</h2>
        <form method="get" className="flex items-center gap-2">
          <select
            name="horse"
            defaultValue={horseFilter}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">全ての馬</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.is_retouch ? " 🔁リタッチ" : ""}
              </option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>
            絞り込み
          </button>
        </form>
      </div>

      {reports.length === 0 ? (
        <EmptyState message="騎乗報告はまだありません" />
      ) : (
        <Table headers={["日付", "生徒", "馬", "時限・授業名", "騎乗内容", "馬の状態"]}>
          {reports.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <Td className="whitespace-nowrap text-gray-600">{fmtDate(r.report_date)}</Td>
              <Td className="whitespace-nowrap">
                {r.student ? (
                  <Link href={`/admin/students/${r.student.id}`} className="font-semibold text-brand-700 hover:underline">
                    {r.student.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap">
                {r.horse ? (
                  <span className="text-gray-800">
                    {r.horse.name}
                    {r.horse.is_retouch && (
                      <span className="ml-1">
                        <Badge tone="purple">リタッチ</Badge>
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="whitespace-nowrap text-gray-600">{r.lesson ?? "—"}</Td>
              <Td className="max-w-72">
                <p className="line-clamp-2 whitespace-pre-wrap text-gray-800" title={r.content}>
                  {r.content}
                </p>
              </Td>
              <Td className="max-w-56">
                {r.horse_condition ? (
                  <p className="line-clamp-2 whitespace-pre-wrap text-gray-600" title={r.horse_condition}>
                    {r.horse_condition}
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
