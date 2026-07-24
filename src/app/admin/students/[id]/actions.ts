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
  const name = String(formData.get("name") ?? "").trim();
  const kana = String(formData.get("kana") ?? "").trim();
  const student_number = String(formData.get("student_number") ?? "").trim();
  const class_name = String(formData.get("class_name") ?? "").trim();
  const dorm_room = String(formData.get("dorm_room") ?? "").trim();
  const assigned_horse_id = String(formData.get("assigned_horse_id") ?? "").trim();
  const stall_number = String(formData.get("stall_number") ?? "").trim();
  const enrollment_date = String(formData.get("enrollment_date") ?? "").trim();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const parent_user_id = String(formData.get("parent_user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "") as StudentState;

  if (!id) return { error: "対象の生徒が不明です" };
  if (!name || !student_number) return { error: "氏名と学籍番号は必須です" };
  if (!VALID_STATES.includes(status)) return { error: "在籍状況の値が不正です" };

  // 本人アカウントは1生徒にのみ連携可能
  if (user_id) {
    const { data: linked } = await adminDb().from("students").select("id").eq("user_id", user_id).neq("id", id).limit(1);
    if (linked && linked.length > 0) return { error: "その本人アカウントは既に別の生徒に連携されています" };
  }

  const { error } = await adminDb()
    .from("students")
    .update({
      name,
      kana: kana || null,
      student_number,
      class_name: class_name || null,
      dorm_room: dorm_room || null,
      assigned_horse_id: assigned_horse_id || null,
      stall_number: stall_number || null,
      enrollment_date: enrollment_date || null,
      user_id: user_id || null,
      parent_user_id: parent_user_id || null,
      status,
    })
    .eq("id", id);

  if (error?.code === "23505") return { error: "その学籍番号は既に登録されています" };

  if (error) return { error: "保存に失敗しました" };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  return { ok: true };
}
