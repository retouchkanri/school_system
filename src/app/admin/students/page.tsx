import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, StatCard, type BadgeTone } from "@/components/ui";
import type { Student, Horse, StudentState } from "@/lib/types";
import StudentForm, { type HorseOption } from "./student-form";

const STATE_LABELS: Record<StudentState, string> = {
  enrolled: "在籍",
  graduated: "卒業",
  withdrawn: "退学",
};

const STATE_TONES: Record<StudentState, BadgeTone> = {
  enrolled: "green",
  graduated: "blue",
  withdrawn: "gray",
};

type StudentRow = Student & { horse: Pick<Horse, "id" | "name" | "is_retouch"> | null };

export default async function StudentsPage() {
  const db = adminDb();
  const [{ data: studentsData }, { data: horsesData }] = await Promise.all([
    db
      .from("students")
      .select("*, horse:horses(id, name, is_retouch)")
      .order("student_number", { ascending: true }),
    db.from("horses").select("*").order("name", { ascending: true }),
  ]);

  const students = (studentsData ?? []) as StudentRow[];
  const horses = (horsesData ?? []) as Horse[];
  const horseOptions: HorseOption[] = horses.map((h) => ({ id: h.id, name: h.name, is_retouch: h.is_retouch }));

  const enrolled = students.filter((s) => s.status === "enrolled").length;
  const graduated = students.filter((s) => s.status === "graduated").length;
  const withdrawn = students.filter((s) => s.status === "withdrawn").length;

  return (
    <div>
      <PageHeader title="生徒一覧" description="在校生の基本情報・担当馬・寮部屋を管理します" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="全生徒数" value={students.length} sub="登録済み" />
        <StatCard label="在籍" value={enrolled} tone="success" />
        <StatCard label="卒業" value={graduated} />
        <StatCard label="退学" value={withdrawn} tone="danger" />
      </div>

      <Card title="新規生徒登録" className="mb-6">
        <StudentForm horses={horseOptions} defaultDate={toDateInput()} />
      </Card>

      {students.length === 0 ? (
        <EmptyState message="生徒が登録されていません" />
      ) : (
        <Table headers={["学籍番号", "氏名", "クラス", "寮部屋", "担当馬", "馬房", "入学日", "在籍状況"]}>
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <Td className="font-mono text-xs text-gray-600">{s.student_number}</Td>
              <Td>
                <Link href={`/admin/students/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                  {s.name}
                </Link>
                {s.kana && <span className="ml-2 text-xs text-gray-400">{s.kana}</span>}
              </Td>
              <Td className="text-gray-700">{s.class_name ?? "—"}</Td>
              <Td className="text-gray-700">{s.dorm_room ?? "—"}</Td>
              <Td>
                {s.horse ? (
                  <span className="text-gray-800">
                    {s.horse.name}
                    {s.horse.is_retouch && (
                      <span className="ml-1">
                        <Badge tone="purple">リタッチ</Badge>
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">未割当</span>
                )}
              </Td>
              <Td className="text-gray-700">{s.stall_number ?? "—"}</Td>
              <Td className="text-gray-600">{fmtDate(s.enrollment_date)}</Td>
              <Td>
                <Badge tone={STATE_TONES[s.status]}>{STATE_LABELS[s.status]}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
