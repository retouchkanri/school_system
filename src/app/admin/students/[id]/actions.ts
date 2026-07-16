"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import type { StudentState } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_STATES: StudentState[] = ["enrolled", "graduated", "withdrawn"];

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  const class_name = String(formData.get("class_name") ?? "").trim();
  const dorm_room = String(formData.get("dorm_room") ?? "").trim();
  const assigned_horse_id = String(formData.get("assigned_horse_id") ?? "").trim();
  const stall_number = String(formData.get("stall_number") ?? "").trim();
  const status = String(formData.get("status") ?? "") as StudentState;

  if (!id) return { error: "対象の生徒が不明です" };
  if (!VALID_STATES.includes(status)) return { error: "在籍状況の値が不正です" };

  const { error } = await adminDb()
    .from("students")
    .update({
      class_name: class_name || null,
      dorm_room: dorm_room || null,
      assigned_horse_id: assigned_horse_id || null,
      stall_number: stall_number || null,
      status,
    })
    .eq("id", id);

  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  return { ok: true };
}
