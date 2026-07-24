"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const student_number = String(formData.get("student_number") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const kana = String(formData.get("kana") ?? "").trim();
  const class_name = String(formData.get("class_name") ?? "").trim();
  const dorm_room = String(formData.get("dorm_room") ?? "").trim();
  const assigned_horse_id = String(formData.get("assigned_horse_id") ?? "").trim();
  const stall_number = String(formData.get("stall_number") ?? "").trim();
  const enrollment_date = String(formData.get("enrollment_date") ?? "").trim();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const parent_user_id = String(formData.get("parent_user_id") ?? "").trim();

  if (!student_number || !name) {
    return { error: "学籍番号と氏名は必須です" };
  }

  // 本人アカウントは1生徒にのみ連携可能
  if (user_id) {
    const { data: linked } = await adminDb().from("students").select("id").eq("user_id", user_id).limit(1);
    if (linked && linked.length > 0) return { error: "その本人アカウントは既に別の生徒に連携されています" };
  }

  const { error } = await adminDb().from("students").insert({
    student_number,
    name,
    kana: kana || null,
    class_name: class_name || null,
    dorm_room: dorm_room || null,
    assigned_horse_id: assigned_horse_id || null,
    stall_number: stall_number || null,
    enrollment_date: enrollment_date || null,
    user_id: user_id || null,
    parent_user_id: parent_user_id || null,
    status: "enrolled",
  });

  if (error) {
    if (error.code === "23505") return { error: "その学籍番号は既に登録されています" };
    return { error: "登録に失敗しました" };
  }

  revalidatePath("/admin/students");
  return { ok: true };
}
