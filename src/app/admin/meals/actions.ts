"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import type { MealType } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

export async function toggleMeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const meal = String(formData.get("meal") ?? "") as MealType;
  const eaten = String(formData.get("eaten") ?? "") === "true";

  if (!student_id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "入力が不正です" };
  if (!VALID_MEALS.includes(meal)) return { error: "食事区分の値が不正です" };

  const { error } = await adminDb()
    .from("meal_records")
    .upsert({ student_id, date, meal, eaten }, { onConflict: "student_id,date,meal" });

  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/meals");
  return { ok: true };
}
