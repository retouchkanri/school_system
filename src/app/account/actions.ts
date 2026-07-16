"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface AccountState {
  ok?: boolean;
  error?: string;
}

export async function updateAccountAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "ログインが必要です" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "氏名を入力してください" };

  const { error } = await adminDb()
    .from("profiles")
    .update({
      full_name: fullName,
      phone: String(formData.get("phone") ?? "").trim() || null,
      line_id: String(formData.get("line_id") ?? "").trim() || null,
    })
    .eq("id", profile.id);
  if (error) return { error: "保存に失敗しました" };

  const newPassword = String(formData.get("new_password") ?? "");
  if (newPassword) {
    if (newPassword.length < 8) return { error: "パスワードは8文字以上で入力してください" };
    const { error: pwErr } = await adminDb().auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
    if (pwErr) return { error: "パスワードの変更に失敗しました" };
  }

  revalidatePath("/account");
  return { ok: true };
}
