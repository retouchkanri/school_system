import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, btnSecondary, btnSmall, type BadgeTone } from "@/components/ui";
import type { Student, TrainingRecord } from "@/lib/types";
import TrainingForm, { type StudentOption, type TrainingEditValues } from "./training-form";
import DeleteTrainingButton from "./delete-button";
import { TRAINING_CATEGORIES } from "./categories";

const CATEGORY_TONES: Record<string, BadgeTone> = {
  校外研修: "blue",
  資格: "purple",
  講習: "amber",
  実習: "green",
};

type TrainingRow = TrainingRecord & { student: Pick<Student, "id" | "name"> | null };

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; student?: string; category?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const editId = sp.edit ?? "";
  const studentFilter = sp.student ?? "";
  const categoryFilter = TRAINING_CATEGORIES.includes(sp.category ?? "") ? (sp.category as string) : "";
  const filtered = !!studentFilter || !!categoryFilter;

  const db = adminDb();
  let listQuery = db
    .from("training_records")
    .select("*, student:students(id, name)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(filtered ? 200 : 50);
  if (studentFilter) listQuery = listQuery.eq("student_id", studentFilter);
  if (categoryFilter) listQuery = listQuery.eq("category", categoryFilter);

  const [{ data: trainingsData }, { data: studentsData }] = await Promise.all([
    listQuery,
    db.from("students").select("*").order("student_number", { ascending: true }),
  ]);

  const trainings = (trainingsData ?? []) as TrainingRow[];
  const students = (studentsData ?? []) as Student[];

  // 在籍中の生徒を先に、それ以外を後に (各グループ内は学籍番号順)
  const sortedStudents = [
    ...students.filter((s) => s.status === "enrolled"),
    ...students.filter((s) => s.status !== "enrolled"),
  ];
  const studentOptions: StudentOption[] = sortedStudents.map((s) => ({
    id: s.id,
    name: s.name,
    student_number: s.student_number,
    status: s.status,
  }));

  const editRecordRaw = editId
    ? (((await db.from("training_records").select("*").eq("id", editId).maybeSingle()).data ??
        null) as TrainingRecord | null)
    : null;
  const editRecord: TrainingEditValues | null = editRecordRaw
    ? {
        id: editRecordRaw.id,
        student_id: editRecordRaw.student_id,
        title: editRecordRaw.title,
        category: editRecordRaw.category,
        date: editRecordRaw.date,
        result: editRecordRaw.result,
        instructor: editRecordRaw.instructor,
        notes: editRecordRaw.notes,
      }
    : null;

  const filterQuery = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (studentFilter) params.set("student", studentFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return qs ? `/admin/trainings?${qs}` : "/admin/trainings";
  };

  return (
    <div>
      <PageHeader title="研修管理" description="校外研修・資格・講習・実習の受講記録を管理します" />

      <Card title={editRecord ? "研修記録の編集" : "新規研修の登録"} className="mb-6">
        <TrainingForm
          key={editRecord?.id ?? "new"}
          students={studentOptions}
          defaultDate={toDateInput()}
          record={editRecord}
        />
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">
          研修記録一覧 {filtered ? `(絞り込み中 最大200件・${trainings.length}件)` : "(新しい順50件)"}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <form method="get" className="flex flex-wrap items-center gap-2">
            {editId && <input type="hidden" name="edit" value={editId} />}
            <select
              name="student"
              defaultValue={studentFilter}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">全ての生徒</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_number})
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">全てのカテゴリ</option>
              {TRAINING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" className={btnSecondary}>
              絞り込み
            </button>
          </form>
          {filtered && (
            <Link
              href={editId ? `/admin/trainings?edit=${editId}` : "/admin/trainings"}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              条件をクリア
            </Link>
          )}
        </div>
      </div>

      {trainings.length === 0 ? (
        <EmptyState message={filtered ? "条件に一致する研修記録はありません" : "研修記録はまだありません"} />
      ) : (
        <Table headers={["日付", "生徒", "研修名", "カテゴリ", "結果", "担当講師", "備考", "操作"]}>
          {trainings.map((t) => (
            <tr key={t.id} className={`hover:bg-gray-50 ${t.id === editId ? "bg-amber-50" : ""}`}>
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
              <Td className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Link href={filterQuery({ edit: t.id })} className={btnSmall}>
                    編集
                  </Link>
                  <DeleteTrainingButton id={t.id} />
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
