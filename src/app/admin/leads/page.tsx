import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate } from "@/lib/format";
import { PROGRESS_STEPS } from "@/lib/constants";
import {
  PageHeader,
  Table,
  Td,
  LeadStatusBadge,
  Badge,
  ProgressTracker,
  EmptyState,
  inputCls,
  btnSecondary,
} from "@/components/ui";
import type { Lead, LeadStatus, Profile, Student } from "@/lib/types";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = PROGRESS_STEPS.some((s) => s.key === sp.status) ? (sp.status as LeadStatus) : "";

  const db = adminDb();
  let query = db.from("leads").select("*").order("created_at", { ascending: false });
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    query = query.or(`name.ilike.${like},kana.ilike.${like},email.ilike.${like}`);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const [{ data: leadsData }, { data: staffData }, { data: studentsData }] = await Promise.all([
    query,
    db.from("profiles").select("*").eq("role", "admin"),
    // 在籍中の生徒に紐付くリードは、ステータスを「在校生」とし学籍番号を表示する
    db.from("students").select("lead_id, student_number").eq("status", "enrolled").not("lead_id", "is", null),
  ]);
  const leads = (leadsData ?? []) as Lead[];
  const staffMap = new Map(((staffData ?? []) as Profile[]).map((p) => [p.id, p.full_name]));
  const studentNumberByLead = new Map(
    ((studentsData ?? []) as Pick<Student, "lead_id" | "student_number">[]).map((s) => [s.lead_id, s.student_number])
  );

  return (
    <div>
      <PageHeader
        title="リード(見込み客)一覧"
        description={`資料請求から入学までの全リードを管理します(${leads.length}件)`}
      />

      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3 border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-64">
          <label className="mb-1 block text-xs font-semibold text-gray-600">キーワード検索</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="氏名・フリガナ・メールで検索"
            className={inputCls}
          />
        </div>
        <div className="w-52">
          <label className="mb-1 block text-xs font-semibold text-gray-600">ステータス</label>
          <select name="status" defaultValue={status} className={inputCls}>
            <option value="">すべて</option>
            {PROGRESS_STEPS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btnSecondary}>
          絞り込む
        </button>
        {(q || status) && (
          <Link href="/admin/leads" className="text-xs font-medium text-gray-500 hover:text-brand-600 hover:underline">
            条件をクリア
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <EmptyState message="条件に一致するリードがありません" />
      ) : (
        <Table
          headers={["No.", "氏名", "学年", "希望学科", "ステータス", "進捗", "資料送付日", "担当者", "登録日"]}
        >
          {leads.map((lead, index) => {
            const studentNumber = studentNumberByLead.get(lead.id);
            return (
              <tr key={lead.id} className="hover:bg-gray-50">
                <Td className="whitespace-nowrap tabular-nums text-gray-500">{index + 1}</Td>
                <Td>
                  <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-brand-700 hover:underline">
                    {lead.name}
                  </Link>
                  {lead.kana && <p className="text-[11px] text-gray-400">{lead.kana}</p>}
                </Td>
                <Td className="text-gray-600">{lead.grade ?? "—"}</Td>
                <Td className="text-gray-600">{lead.desired_course ?? "—"}</Td>
                <Td>
                  {studentNumber ? <Badge tone="brand">在校生</Badge> : <LeadStatusBadge status={lead.status} />}
                </Td>
                <Td>
                  <ProgressTracker status={lead.status} compact />
                </Td>
                <Td className="text-gray-500">{fmtDate(lead.material_sent_date)}</Td>
                <Td className="text-gray-600">
                  {lead.assigned_staff ? (staffMap.get(lead.assigned_staff) ?? "—") : "未割当"}
                </Td>
                <Td className="text-gray-500">{fmtDate(lead.created_at)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
