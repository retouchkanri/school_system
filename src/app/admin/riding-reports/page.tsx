import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, EmptyState, btnSecondary } from "@/components/ui";
import type { Student, Horse, RidingReport } from "@/lib/types";
import ReportForm, { type StudentOption, type HorseOption } from "./report-form";
import ReportRow from "./report-row";

type ReportRecord = RidingReport & {
  student: Pick<Student, "id" | "name"> | null;
  horse: Pick<Horse, "id" | "name" | "is_retouch"> | null;
};

export default async function RidingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ horse?: string }>;
}) {
  await requireRole("admin");
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

  const reports = (reportsData ?? []) as ReportRecord[];
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
        <>
          <Table headers={["日付", "生徒", "馬", "時限・授業名", "落馬", "乗りやすさ", "騎乗内容", "馬の状態", "操作"]}>
            {reports.map((r) => (
              <ReportRow
                key={r.id}
                students={studentOptions}
                horses={horseOptions}
                report={{
                  id: r.id,
                  report_date: r.report_date,
                  student_id: r.student_id,
                  student_name: r.student?.name ?? null,
                  horse_id: r.horse_id,
                  horse_name: r.horse?.name ?? null,
                  horse_is_retouch: r.horse?.is_retouch ?? false,
                  lesson: r.lesson,
                  content: r.content,
                  horse_condition: r.horse_condition,
                  fell_off: r.fell_off ?? false,
                  rideability: r.rideability,
                  horse_mood: r.horse_mood,
                  incident: r.incident,
                }}
              />
            ))}
          </Table>
          <p className="mt-3 text-xs text-gray-400">
            ※ 報告を編集・削除しても月次AI要約は自動で作り直されません。反映するには
            <Link href="/admin/retouch" className="mx-1 font-semibold text-brand-600 hover:underline">
              リタッチ馬 月次報告
            </Link>
            ページで要約を再生成してください。
          </p>
        </>
      )}
    </div>
  );
}
