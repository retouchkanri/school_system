"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

function dateOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return DATE_RE.test(v) ? v : null;
}

function horsePayload(formData: FormData) {
  const ageRaw = String(formData.get("age") ?? "").trim();
  const ageNum = ageRaw === "" ? null : Number(ageRaw);
  return {
    name: String(formData.get("name") ?? "").trim(),
    breed: text(formData, "breed"),
    age: ageNum !== null && Number.isFinite(ageNum) ? ageNum : null,
    stall: text(formData, "stall"),
    is_retouch: formData.get("is_retouch") === "on",
    notes: text(formData, "notes"),
    photo_url: text(formData, "photo_url"),
    sex: text(formData, "sex"),
    color: text(formData, "color"),
    birth_date: dateOrNull(formData, "birth_date"),
    microchip: text(formData, "microchip"),
    owner: text(formData, "owner"),
    arrived_on: dateOrNull(formData, "arrived_on"),
    departed_on: dateOrNull(formData, "departed_on"),
    active: formData.get("active") === "on",
    insurance_company: text(formData, "insurance_company"),
    insurance_expires_on: dateOrNull(formData, "insurance_expires_on"),
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
  revalidatePath(`/admin/horses/${id}`);
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
  revalidatePath(`/admin/horses/${id}`);
  revalidatePath("/admin/retouch");
}

/* ============ 馬台帳のサブ記録 (入退記録 / 予防接種 / 装蹄) ============ */

function revalidateHorse(horseId: string) {
  revalidatePath("/admin/horses");
  revalidatePath(`/admin/horses/${horseId}`);
}

const MOVEMENT_KINDS = ["arrival", "departure", "transfer", "return"];

/** 入退記録の追加 */
export async function createHorseMovementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");
  const horse_id = String(formData.get("horse_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const date = dateOrNull(formData, "date");

  if (!horse_id) return { error: "対象の馬が不明です" };
  if (!MOVEMENT_KINDS.includes(kind)) return { error: "区分を選択してください" };
  if (!date) return { error: "日付を入力してください" };

  const { error } = await adminDb().from("horse_movements").insert({
    horse_id,
    kind,
    date,
    counterpart: text(formData, "counterpart"),
    reason: text(formData, "reason"),
    notes: text(formData, "notes"),
    created_by: profile.id,
  });
  if (error) return { error: "入退記録の登録に失敗しました" };

  revalidateHorse(horse_id);
  return { ok: true };
}

/** 予防接種歴の追加 */
export async function createHorseVaccinationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");
  const horse_id = String(formData.get("horse_id") ?? "");
  const vaccine_name = String(formData.get("vaccine_name") ?? "").trim();
  const date = dateOrNull(formData, "date");

  if (!horse_id) return { error: "対象の馬が不明です" };
  if (!vaccine_name) return { error: "ワクチン名を入力してください" };
  if (!date) return { error: "接種日を入力してください" };

  const { error } = await adminDb().from("horse_vaccinations").insert({
    horse_id,
    vaccine_name,
    date,
    next_due_date: dateOrNull(formData, "next_due_date"),
    veterinarian: text(formData, "veterinarian"),
    lot_number: text(formData, "lot_number"),
    notes: text(formData, "notes"),
    created_by: profile.id,
  });
  if (error) return { error: "予防接種歴の登録に失敗しました" };

  revalidateHorse(horse_id);
  return { ok: true };
}

/** 装蹄歴の追加 */
export async function createHorseFarrierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");
  const horse_id = String(formData.get("horse_id") ?? "");
  const date = dateOrNull(formData, "date");

  if (!horse_id) return { error: "対象の馬が不明です" };
  if (!date) return { error: "施術日を入力してください" };

  const { error } = await adminDb().from("horse_farrier_records").insert({
    horse_id,
    date,
    kind: text(formData, "kind"),
    farrier: text(formData, "farrier"),
    next_due_date: dateOrNull(formData, "next_due_date"),
    notes: text(formData, "notes"),
    created_by: profile.id,
  });
  if (error) return { error: "装蹄歴の登録に失敗しました" };

  revalidateHorse(horse_id);
  return { ok: true };
}

/** 削除できるサブ記録のテーブル (フォームからテーブル名を直接受け取らないためのホワイトリスト) */
const DELETABLE_RECORDS: Record<string, string> = {
  movement: "horse_movements",
  vaccination: "horse_vaccinations",
  farrier: "horse_farrier_records",
};

/** 入退記録・予防接種歴・装蹄歴の削除 */
export async function deleteHorseRecordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const record = String(formData.get("record") ?? "");
  const id = String(formData.get("id") ?? "");
  const horse_id = String(formData.get("horse_id") ?? "");
  const table = DELETABLE_RECORDS[record];

  if (!table) return { error: "不正な操作です" };
  if (!id) return { error: "対象の記録が不明です" };

  const { error } = await adminDb().from(table).delete().eq("id", id);
  if (error) return { error: "削除に失敗しました" };

  if (horse_id) revalidateHorse(horse_id);
  else revalidatePath("/admin/horses");
  return { ok: true };
}
