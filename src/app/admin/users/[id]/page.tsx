import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { BackLink, Card } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { EditUserForm, ResetPasswordForm } from "./edit-form";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireRole("admin");

  const { data } = await adminDb().from("profiles").select("*").eq("id", id).maybeSingle();
  const user = data as Profile | null;
  if (!user) notFound();

  return (
    <div>
      <BackLink href="/admin/users" label="ユーザー一覧へ戻る" />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="ユーザー情報の編集">
          <EditUserForm user={user} isSelf={user.id === me.id} />
        </Card>

        <Card title="パスワード再発行">
          <ResetPasswordForm userId={user.id} />
        </Card>
      </div>
    </div>
  );
}
