"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadAvatarFile } from "@/lib/avatar";

export interface AccountState {
  ok?: boolean;
  error?: string;
}

function normalizeBirthDate(raw: string): string | null | { error: string } {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const m = value.slice(4, 6);
    const d = value.slice(6, 8);
    const iso = `${y}-${m}-${d}`;
    const dt = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== Number(y)) {
      return { error: "生年月日の形式が正しくありません(例: 20040212)" };
    }
    return iso;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const dt = new Date(`${value}T00:00:00`);
    if (Number.isNaN(dt.getTime())) {
      return { error: "生年月日の形式が正しくありません(例: 20040212)" };
    }
    return value;
  }
  return { error: "生年月日は半角数字8桁で入力してください(例: 20040212)" };
}

export async function updateAccountAction(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const profile = await getSessionProfile();
  if (!profile) return { error: "ログインが必要です" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "氏名を入力してください" };

  const birthRaw = String(formData.get("birth_date") ?? "");
  const birthResult = normalizeBirthDate(birthRaw);
  if (birthResult && typeof birthResult === "object" && "error" in birthResult) {
    return { error: birthResult.error };
  }
  const birthDate = birthResult as string | null;

  const updates: Record<string, string | null> = {
    full_name: fullName,
    phone: String(formData.get("phone") ?? "").trim() || null,
  };

  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploaded = await uploadAvatarFile(profile.id, avatarFile);
    if (typeof uploaded === "object") return { error: uploaded.error };
    updates.avatar_url = uploaded;
  }

  const { error } = await adminDb().from("profiles").update(updates).eq("id", profile.id);
  if (error) return { error: "保存に失敗しました" };

  const { data: lead } = await adminDb()
    .from("leads")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (lead) {
    const { error: leadErr } = await adminDb()
      .from("leads")
      .update({ birth_date: birthDate })
      .eq("id", lead.id);
    if (leadErr) return { error: "生年月日の保存に失敗しました" };
  }

  const oldPassword = String(formData.get("old_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (oldPassword || newPassword || confirmPassword) {
    if (!oldPassword) return { error: "現在のパスワードを入力してください" };
    if (!newPassword) return { error: "新しいパスワードを入力してください" };
    if (newPassword.length < 8) return { error: "新しいパスワードは8文字以上で入力してください" };
    if (newPassword !== confirmPassword) return { error: "新しいパスワード(確認)が一致しません" };
    if (!profile.email) return { error: "メールアドレスが未設定のためパスワードを変更できません" };

    const supabase = await createClient();
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: oldPassword,
    });
    if (verifyErr) return { error: "現在のパスワードが正しくありません" };

    const { error: pwErr } = await adminDb().auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
    if (pwErr) return { error: "パスワードの変更に失敗しました" };
  }

  revalidatePath("/account");
  return { ok: true };
}
