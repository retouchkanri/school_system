import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { toDateInput } from "@/lib/format";
import { PageHeader, Card, Table, Td, Badge, EmptyState, StatCard, type BadgeTone } from "@/components/ui";
import type { Lead, Student } from "@/lib/types";
import StudentForm, { type AccountOption, type HorseOption } from "./student-form";

type CourseKind = "高" | "専" | null;

type LeadContact = Pick<Lead, "email" | "postal_code" | "address" | "phone" | "desired_course">;

type StudentRow = Student & { lead: LeadContact | null };

type ProfileEmail = { id: string; email: string | null };

function parseDormInfo(dormInfo: string | null | undefined) {
  const text = dormInfo ?? "";
  const email = text.match(/本人メール:([^\s/]+)/)?.[1]?.trim() ?? null;
  const postal = text.match(/〒([0-9ｰ\-－]+)/)?.[1]?.trim() ?? null;
  const parentPhone = text.match(/保護者連絡先:([^\s/]+)/)?.[1]?.trim() ?? null;
  const parentEmail = text.match(/保護者メール:([^\s/]+)/)?.[1]?.trim() ?? null;
  // Address sits between postal (or tag) and the next labeled field
  let address: string | null = null;
  const parts = text.split(" / ").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (
      part.startsWith("[") ||
      part.startsWith("本人メール:") ||
      part.startsWith("〒") ||
      part.startsWith("保護者連絡先:") ||
      part.startsWith("保護者メール:")
    ) {
      continue;
    }
    address = part;
    break;
  }
  return { email, postal, address, parentPhone, parentEmail };
}

function resolveCourseKind(student: StudentRow): CourseKind {
  const className = student.class_name ?? "";
  if (/高等/.test(className) || className.startsWith("高")) return "高";
  if (/専門/.test(className) || className.startsWith("専")) return "専";

  const desired = student.lead?.desired_course ?? "";
  if (/高等/.test(desired)) return "高";
  if (/専門/.test(desired)) return "専";

  const num = student.student_number ?? "";
  if (/^H/i.test(num)) return "高";
  if (/^S/i.test(num)) return "専";

  return null;
}

function resolveEnrollmentParts(student: StudentRow): { year: string; month: string } {
  if (student.enrollment_date) {
    const d = new Date(student.enrollment_date);
    if (!Number.isNaN(d.getTime())) {
      return { year: String(d.getFullYear()), month: String(d.getMonth() + 1) };
    }
    const m = student.enrollment_date.match(/^(\d{4})-(\d{1,2})/);
    if (m) return { year: m[1], month: String(Number(m[2])) };
  }
  const fromClass = (student.class_name ?? "").match(/(\d{4})年(\d{1,2})月/);
  if (fromClass) return { year: fromClass[1], month: String(Number(fromClass[2])) };
  return { year: "—", month: "—" };
}

function courseBadge(kind: CourseKind): { label: string; tone: BadgeTone } | null {
  if (kind === "高") return { label: "高", tone: "brand" };
  if (kind === "専") return { label: "専", tone: "amber" };
  return null;
}

function rowWash(kind: CourseKind): string {
  if (kind === "高") return "bg-brand-50/40 hover:bg-brand-50/70";
  if (kind === "専") return "bg-amber-50/50 hover:bg-amber-50/80";
  return "hover:bg-gray-50";
}

const TABLE_HEADERS = [
  "No.",
  "氏　名",
  "区分",
  "入学年度",
  "月",
  "メールアドレス",
  "郵便番号",
  "自宅住所",
  "保護者連絡先",
  "保護者メールアドレス",
];

export default async function StudentsPage() {
  await requireRole("admin");
  const db = adminDb();
  const [{ data: studentsData }, { data: horsesData }, { data: accountsData }] = await Promise.all([
    db
      .from("students")
      .select(
        "*, lead:leads(email, postal_code, address, phone, desired_course)"
      )
      .order("enrollment_date", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    db.from("horses").select("*").order("name", { ascending: true }),
    db.from("profiles").select("id, full_name, email, role").in("role", ["student", "parent"]).order("full_name", { ascending: true }),
  ]);

  const students = (studentsData ?? []) as StudentRow[];
  const horses = (horsesData ?? []) as { id: string; name: string; is_retouch: boolean }[];
  const horseOptions: HorseOption[] = horses.map((h) => ({ id: h.id, name: h.name, is_retouch: h.is_retouch }));
  const accounts = (accountsData ?? []) as { id: string; full_name: string; email: string | null; role: string }[];
  const emailById = new Map<string, string | null>(
    (accounts as ProfileEmail[]).map((a) => [a.id, a.email])
  );
  const toAccountOption = (a: { id: string; full_name: string; email: string | null }): AccountOption => ({
    id: a.id,
    label: a.email ? `${a.full_name} (${a.email})` : a.full_name,
  });
  const studentAccounts = accounts.filter((a) => a.role === "student").map(toAccountOption);
  const parentAccounts = accounts.filter((a) => a.role === "parent").map(toAccountOption);

  const enrolled = students.filter((s) => s.status === "enrolled").length;
  const graduated = students.filter((s) => s.status === "graduated").length;
  const withdrawn = students.filter((s) => s.status === "withdrawn").length;

  return (
    <div>
      <PageHeader title="生徒一覧" description="在校生の基本情報を管理します（CSVと同じ項目で表示）" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="全生徒数" value={students.length} sub="登録済み" />
        <StatCard label="在籍" value={enrolled} tone="success" />
        <StatCard label="卒業" value={graduated} />
        <StatCard label="退学" value={withdrawn} tone="danger" />
      </div>

      <Card title="新規生徒登録" className="mb-6">
        <StudentForm
          horses={horseOptions}
          defaultDate={toDateInput()}
          studentAccounts={studentAccounts}
          parentAccounts={parentAccounts}
        />
      </Card>

      {students.length === 0 ? (
        <EmptyState message="生徒が登録されていません" />
      ) : (
        <Table headers={TABLE_HEADERS}>
          {students.map((s, index) => {
            const dorm = parseDormInfo(s.dorm_info);
            const kind = resolveCourseKind(s);
            const badge = courseBadge(kind);
            const { year, month } = resolveEnrollmentParts(s);
            const email =
              (s.user_id ? emailById.get(s.user_id) : null) ||
              s.lead?.email ||
              dorm.email ||
              null;
            const postal = s.lead?.postal_code || dorm.postal || null;
            const address = s.lead?.address || dorm.address || null;
            const parentPhone = s.lead?.phone || dorm.parentPhone || null;
            const parentEmail =
              (s.parent_user_id ? emailById.get(s.parent_user_id) : null) ||
              dorm.parentEmail ||
              null;

            return (
              <tr key={s.id} className={rowWash(kind)}>
                <Td className="whitespace-nowrap tabular-nums text-gray-500">{index + 1}</Td>
                <Td>
                  <Link href={`/admin/students/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                    {s.name}
                  </Link>
                  {s.kana && <span className="ml-2 text-xs text-gray-400">{s.kana}</span>}
                </Td>
                <Td>
                  {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : <span className="text-gray-400">—</span>}
                </Td>
                <Td className="tabular-nums text-gray-700">{year}</Td>
                <Td className="tabular-nums text-gray-700">{month}</Td>
                <Td className="max-w-[14rem] text-gray-700">
                  <span className="block truncate" title={email ?? undefined}>
                    {email ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap tabular-nums text-gray-700">{postal ?? "—"}</Td>
                <Td className="max-w-[18rem] text-gray-700">
                  <span className="block truncate" title={address ?? undefined}>
                    {address ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-gray-700">{parentPhone ?? "—"}</Td>
                <Td className="max-w-[14rem] text-gray-700">
                  <span className="block truncate" title={parentEmail ?? undefined}>
                    {parentEmail ?? "—"}
                  </span>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
