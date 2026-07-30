"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 騎乗報告の評価項目 (落馬・乗りやすさ・馬の様子・ヒヤリハット) */
function readEvalInput(formData: FormData) {
  const raw = String(formData.get("rideability") ?? "").trim();
  const n = Number(raw);
  return {
    fell_off: formData.get("fell_off") === "on",
    rideability: raw && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null,
    horse_mood: String(formData.get("horse_mood") ?? "").trim() || null,
    incident: String(formData.get("incident") ?? "").trim() || null,
  };
}

/** 馬の評価集計ページも作り直す */
function revalidateRelated(horseId?: string) {
  revalidatePath("/admin/riding-reports");
  revalidatePath("/student/riding");
  revalidatePath("/admin/horses");
  if (horseId) revalidatePath(`/admin/horses/${horseId}`);
}

export async function createRidingReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const horse_id = String(formData.get("horse_id") ?? "");
  const report_date = String(formData.get("report_date") ?? "");
  const lesson = String(formData.get("lesson") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const horse_condition = String(formData.get("horse_condition") ?? "").trim();
  const evaluation = readEvalInput(formData);

  if (!student_id || !horse_id) return { error: "生徒と馬を選択してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report_date)) return { error: "日付を入力してください" };
  if (!content) return { error: "騎乗内容を入力してください" };

  const { error } = await adminDb().from("riding_reports").insert({
    student_id,
    horse_id,
    report_date,
    lesson: lesson || null,
    content,
    horse_condition: horse_condition || null,
    ...evaluation,
    reported_by: profile.id,
  });

  if (error) return { error: "登録に失敗しました" };

  revalidateRelated(horse_id);
  return { ok: true };
}

/** 騎乗報告を修正する (職員は全ての報告を編集できる) */
export async function updateRidingReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  const student_id = String(formData.get("student_id") ?? "");
  const horse_id = String(formData.get("horse_id") ?? "");
  const report_date = String(formData.get("report_date") ?? "");
  const lesson = String(formData.get("lesson") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const horse_condition = String(formData.get("horse_condition") ?? "").trim();
  const evaluation = readEvalInput(formData);

  if (!id) return { error: "対象の報告が不明です" };
  if (!student_id || !horse_id) return { error: "生徒と馬を選択してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report_date)) return { error: "日付を入力してください" };
  if (!content) return { error: "騎乗内容を入力してください" };

  const db = adminDb();
  const { data: existingData } = await db.from("riding_reports").select("id, horse_id").eq("id", id).maybeSingle();
  const existing = (existingData as { id: string; horse_id: string } | null) ?? null;
  if (!existing) return { error: "対象の騎乗報告が見つかりません" };

  const { error } = await db
    .from("riding_reports")
    .update({
      student_id,
      horse_id,
      report_date,
      lesson: lesson || null,
      content,
      horse_condition: horse_condition || null,
      ...evaluation,
    })
    .eq("id", id);

  if (error) return { error: "更新に失敗しました" };

  revalidateRelated(horse_id);
  // 馬を付け替えた場合は元の馬の集計も作り直す
  if (existing.horse_id && existing.horse_id !== horse_id) revalidatePath(`/admin/horses/${existing.horse_id}`);
  return { ok: true };
}

/** 騎乗報告を削除する (職員は全ての報告を削除できる) */
export async function deleteRidingReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "対象の報告が不明です" };

  const db = adminDb();
  const { data: existingData } = await db.from("riding_reports").select("id, horse_id").eq("id", id).maybeSingle();
  const existing = (existingData as { id: string; horse_id: string } | null) ?? null;

  const { error } = await db.from("riding_reports").delete().eq("id", id);
  if (error) return { error: "削除に失敗しました" };

  revalidateRelated(existing?.horse_id);
  return { ok: true };
}
