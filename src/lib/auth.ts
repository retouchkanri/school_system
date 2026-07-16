import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/types";

/** ログイン中ユーザーのプロフィールを取得 (未ログインなら null) */
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await adminDb().from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

/** ロール必須ページ用ガード。 不一致ならロール別ホームへリダイレクト */
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect(roleHome(profile.role));
  return profile;
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "student":
      return "/student";
    case "parent":
      return "/parent";
    case "supporter":
      return "/supporter";
    default:
      return "/mypage";
  }
}
