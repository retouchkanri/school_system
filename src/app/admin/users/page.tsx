import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/format";
import { Card, PageHeader, Badge, EmptyState, Table, Td, inputCls, btnSecondary, type BadgeTone } from "@/components/ui";
import type { Profile, UserRole } from "@/lib/types";
import { CreateAdminForm, DeleteUserButton } from "./user-forms";
import { deleteUserAction } from "./actions";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者・職員",
  applicant: "入学希望者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
};

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  admin: "purple",
  applicant: "blue",
  student: "green",
  parent: "amber",
  supporter: "brand",
};

const TABS: { key: UserRole | "all"; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "admin", label: "管理者・職員" },
  { key: "applicant", label: "入学希望者" },
  { key: "student", label: "在校生" },
  { key: "parent", label: "保護者" },
  { key: "supporter", label: "一口支援者" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const me = await requireRole("admin");
  const sp = await searchParams;
  const roleFilter = (sp.role ?? "all") as UserRole | "all";
  const q = (sp.q ?? "").trim();

  const db = adminDb();
  let query = db.from("profiles").select("*").order("created_at", { ascending: false });
  if (roleFilter !== "all") query = query.eq("role", roleFilter);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    query = query.or(`full_name.ilike.${like},email.ilike.${like}`);
  }
  const { data } = await query;
  const users = (data ?? []) as Profile[];

  return (
    <div>
      <PageHeader title="ユーザー管理" description="管理者・職員アカウントの追加、全ユーザーの編集・削除ができます" />

      <Card title="管理者・職員アカウントを追加" className="mb-6">
        <CreateAdminForm />
      </Card>

      <form method="GET" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="role" value={roleFilter} />
        <div className="w-64">
          <label className="mb-1 block text-xs font-semibold text-gray-600">キーワード検索</label>
          <input type="text" name="q" defaultValue={q} placeholder="氏名・メールで検索" className={inputCls} />
        </div>
        <button type="submit" className={btnSecondary}>
          絞り込む
        </button>
        {q && (
          <Link href={`/admin/users?role=${roleFilter}`} className="text-xs font-medium text-gray-500 hover:text-brand-600 hover:underline">
            検索をクリア
          </Link>
        )}
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/users?role=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              roleFilter === t.key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {users.length === 0 ? (
        <EmptyState message="条件に一致するユーザーがありません" />
      ) : (
        <Table headers={["氏名", "メール", "電話", "ロール", "登録日", ""]}>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <Td className="font-medium text-gray-900">
                <Link href={`/admin/users/${u.id}`} className="text-brand-700 hover:underline">
                  {u.full_name}
                </Link>
                {u.id === me.id && <span className="ml-2 text-[11px] text-gray-400">(自分)</span>}
              </Td>
              <Td className="text-gray-600">{u.email ?? "—"}</Td>
              <Td className="text-gray-600">{u.phone ?? "—"}</Td>
              <Td>
                <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Badge>
              </Td>
              <Td className="text-gray-500">{fmtDateTime(u.created_at)}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/users/${u.id}`} className={btnSecondary}>
                    編集
                  </Link>
                  {u.id !== me.id && (
                    <form action={deleteUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <DeleteUserButton />
                    </form>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
