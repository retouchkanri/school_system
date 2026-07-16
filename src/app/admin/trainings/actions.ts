"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_CATEGORIES = ["校外研修", "資格", "講習", "実習"];

export async function createTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

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

  const { error } = await adminDb().from("training_records").insert({
    student_id,
    title,
    category: category || null,
    date,
    result: result || null,
    instructor: instructor || null,
    notes: notes || null,
  });

  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/trainings");
  return { ok: true };
}
