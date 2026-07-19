"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { uploadAvatarFile } from "@/lib/avatar";
import type { Profile, UserRole } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  password?: string;
}

const ROLES: UserRole[] = ["admin", "applicant", "student", "parent", "supporter"];

function genTempPassword(): string {
  return `baji${Math.floor(10000000 + Math.random() * 90000000)}`;
}

async function countAdmins(): Promise<number> {
  const { count } = await adminDb().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

/** 管理者・職員アカウントの新規追加 */
export async function createAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const lineId = String(formData.get("line_id") ?? "").trim();
  if (!email || !fullName) return { error: "メールアドレスと氏名は必須です" };

  const { data: existing } = await adminDb().from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "このメールアドレスは既に登録されています" };

  const password = genTempPassword();
  const db = adminDb();
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { error: "アカウント作成に失敗しました(既に同じメールのユーザーが存在する可能性があります)" };
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    role: "admin",
    full_name: fullName,
    email,
    phone: phone || null,
    line_id: lineId || null,
  });
  if (profileError) return { error: "プロフィールの作成に失敗しました" };

  await notifyBoth(
    email,
    lineId || null,
    "【東関東馬事学院】管理者アカウント発行のお知らせ",
    `${fullName}様\n\n管理者アカウントを発行しました。以下の情報でログインしてください。\n\nログインID: ${email}\n仮パスワード: ${password}\n\nログイン後、パスワードは「アカウント設定」からいつでも変更いただけます。`,
    "account_issued"
  );

  revalidatePath("/admin/users");
  return { ok: true, message: "管理者アカウントを追加しました", password };
}

/** 既存ユーザーの氏名・電話・LINE ID・ロールの編集 */
export async function updateUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const lineId = String(formData.get("line_id") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!id || !fullName) return { error: "氏名は必須です" };
  if (!ROLES.includes(role)) return { error: "ロールが不正です" };

  if (id === me.id && role !== "admin") {
    return { error: "自分自身の権限は変更できません" };
  }

  const { data: targetData } = await adminDb().from("profiles").select("*").eq("id", id).maybeSingle();
  const target = targetData as Profile | null;
  if (!target) return { error: "対象のユーザーが見つかりません" };

  if (target.role === "admin" && role !== "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) return { error: "最後の管理者の権限は変更できません" };
  }

  const updates: Record<string, string | null> = {
    full_name: fullName,
    phone: phone || null,
    line_id: lineId || null,
    role,
  };

  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploaded = await uploadAvatarFile(id, avatarFile);
    if (typeof uploaded === "object") return { error: uploaded.error };
    updates.avatar_url = uploaded;
  }

  const { error } = await adminDb().from("profiles").update(updates).eq("id", id);
  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "保存しました" };
}

/** パスワード再発行 (新しい仮パスワードを発行し本人へ通知) */
export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "ユーザーIDが不正です" };

  const { data: targetData } = await adminDb().from("profiles").select("*").eq("id", id).maybeSingle();
  const target = targetData as Profile | null;
  if (!target || !target.email) return { error: "対象のユーザーが見つかりません" };

  const password = genTempPassword();
  const { error } = await adminDb().auth.admin.updateUserById(id, { password });
  if (error) return { error: "パスワードの再発行に失敗しました" };

  await notifyBoth(
    target.email,
    target.line_id,
    "【東関東馬事学院】パスワード再発行のお知らせ",
    `${target.full_name}様\n\n新しい仮パスワードを発行しました。\n\nログインID: ${target.email}\n仮パスワード: ${password}\n\nログイン後、パスワードは「アカウント設定」からいつでも変更いただけます。`,
    "password_reset"
  );

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, message: "新しい仮パスワードを発行しました", password };
}

/** ユーザーアカウントの削除 */
export async function deleteUserAction(formData: FormData): Promise<void> {
  const me = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (id === me.id) return; // 自分自身は削除不可

  const { data: targetData } = await adminDb().from("profiles").select("role").eq("id", id).maybeSingle();
  const target = targetData as { role: UserRole } | null;
  if (!target) return;

  if (target.role === "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) return; // 最後の管理者は削除不可
  }

  await adminDb().auth.admin.deleteUser(id);
  revalidatePath("/admin/users");
}
