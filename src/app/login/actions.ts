"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import { roleHome } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "メールアドレスとパスワードを入力してください" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "メールアドレスまたはパスワードが正しくありません" };
  }

  const { data: profile } = await adminDb()
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(roleHome((profile?.role as UserRole) ?? "applicant"));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
