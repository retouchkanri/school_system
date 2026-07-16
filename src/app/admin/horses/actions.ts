"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

function horsePayload(formData: FormData) {
  const ageRaw = String(formData.get("age") ?? "").trim();
  const ageNum = ageRaw === "" ? null : Number(ageRaw);
  return {
    name: String(formData.get("name") ?? "").trim(),
    breed: String(formData.get("breed") ?? "").trim() || null,
    age: ageNum !== null && Number.isFinite(ageNum) ? ageNum : null,
    stall: String(formData.get("stall") ?? "").trim() || null,
    is_retouch: formData.get("is_retouch") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

/** 馬の新規登録 */
export async function createHorseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const payload = horsePayload(formData);
  if (!payload.name) return { error: "馬の名前は必須です" };

  const { error } = await adminDb().from("horses").insert(payload);
  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/horses");
  revalidatePath("/admin/retouch");
  return { ok: true };
}

/** 馬情報の更新 */
export async function updateHorseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "対象の馬が見つかりません" };
  const payload = horsePayload(formData);
  if (!payload.name) return { error: "馬の名前は必須です" };

  const { error } = await adminDb().from("horses").update(payload).eq("id", id);
  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/horses");
  revalidatePath("/admin/retouch");
  return { ok: true };
}

/** リタッチ馬フラグの切替 (1ボタン操作) */
export async function toggleRetouchAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  await adminDb().from("horses").update({ is_retouch: next }).eq("id", id);

  revalidatePath("/admin/horses");
  revalidatePath("/admin/retouch");
}
