"use server";

import { redirect } from "next/navigation";
import { adminDb } from "@/lib/supabase/admin";
import type { PasswordResetToken } from "@/lib/types";

export interface ResetPasswordState {
  ok?: boolean;
  error?: string;
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (!token) return { error: "リンクが無効です。再度パスワード再設定をお申し込みください。" };
  if (password.length < 8) return { error: "パスワードは8文字以上で入力してください" };
  if (password !== passwordConfirmation) return { error: "パスワードが一致しません" };

  const db = adminDb();
  const { data: resetToken } = await db
    .from("password_reset_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  const record = resetToken as PasswordResetToken | null;
  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    return { error: "リンクが無効か期限切れです。再度パスワード再設定をお申し込みください。" };
  }

  const { error: updateError } = await db.auth.admin.updateUserById(record.user_id, { password });
  if (updateError) return { error: "パスワードの変更に失敗しました。時間をおいて再度お試しください。" };

  await db.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id);

  redirect("/login?reset=1");
}
