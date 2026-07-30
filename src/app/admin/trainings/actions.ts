"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { TRAINING_CATEGORIES } from "./categories";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_CATEGORIES = TRAINING_CATEGORIES;

interface TrainingInput {
  student_id: string;
  title: string;
  category: string | null;
  date: string;
  result: string | null;
  instructor: string | null;
  notes: string | null;
}

/** 登録・更新で共通のバリデーション。エラー時は { error } を返す */
function parseTrainingForm(formData: FormData): { error: string } | { data: TrainingInput } {
  const student_id = String(formData.get("student_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const result = String(formData.get("result") ?? "").trim();
  const instructor = String(formData.get("instructor") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!student_id) return { error: "生徒を選択してください" };
  if (!title) return { error: "研修名を入力してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "日付を入力してください" };
  if (category && !VALID_CATEGORIES.includes(category)) return { error: "カテゴリの値が不正です" };

  return {
    data: {
      student_id,
      title,
      category: category || null,
      date,
      result: result || null,
      instructor: instructor || null,
      notes: notes || null,
    },
  };
}

export async function createTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = parseTrainingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await adminDb().from("training_records").insert(parsed.data);

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/trainings");
  return { ok: true };
}

export async function updateTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "更新対象が指定されていません" };

  const parsed = parseTrainingForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const db = adminDb();
  const { data: existing } = await db
    .from("training_records")
    .select("id, student_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "研修記録が見つかりません" };

  const { error } = await db.from("training_records").update(parsed.data).eq("id", id);
  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/students/${existing.student_id}`);
  if (existing.student_id !== parsed.data.student_id) {
    revalidatePath(`/admin/students/${parsed.data.student_id}`);
  }
  revalidatePath("/student/trainings");
  return { ok: true };
}

export async function deleteTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "削除対象が指定されていません" };

  const db = adminDb();
  const { data: existing } = await db
    .from("training_records")
    .select("id, student_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "研修記録が見つかりません" };

  const { error } = await db.from("training_records").delete().eq("id", id);
  if (error) return { error: "削除に失敗しました" };

  revalidatePath("/admin/trainings");
  revalidatePath(`/admin/students/${existing.student_id}`);
  revalidatePath("/student/trainings");
  return { ok: true };
}
