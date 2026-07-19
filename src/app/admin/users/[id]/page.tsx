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

      <div className="mb-6 flex items-center gap-4">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
            {user.full_name.trim().charAt(0) || "?"}
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
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
