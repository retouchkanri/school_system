"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import type { Lead, StudentState } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const VALID_STATES: StudentState[] = ["enrolled", "graduated", "withdrawn"];

/** 入学者専用ページの案内内容から、メール・LINE通知の本文を組み立てる (未入力の項目は省く) */
function composeEnrolleeInfoMessage(params: {
  name: string;
  className: string | null;
  dormRoom: string | null;
  dormInfo: string | null;
  stallNumber: string | null;
  horseName: string | null;
  orientationInfo: string | null;
  itemsToBring: string | null;
  classSchedule: string | null;
  uniformStatus: string | null;
}): { title: string; body: string } | null {
  const sections: string[] = [];
  if (params.orientationInfo) sections.push(`【オリエンテーション情報】\n${params.orientationInfo}`);
  if (params.itemsToBring) sections.push(`【持ち物】\n${params.itemsToBring}`);
  if (params.dormRoom || params.dormInfo) {
    const dormText = [params.dormRoom ? `お部屋: ${params.dormRoom}` : null, params.dormInfo].filter(Boolean).join("\n");
    sections.push(`【寮情報】\n${dormText}`);
  }
  if (params.stallNumber) sections.push(`【配属馬房】\n${params.stallNumber}`);
  if (params.horseName) sections.push(`【担当馬】\n${params.horseName}号`);
  if (params.className) sections.push(`【クラス】\n${params.className}`);
  if (params.classSchedule) sections.push(`【授業スケジュール】\n${params.classSchedule}`);
  if (params.uniformStatus) sections.push(`【制服発送状況】\n${params.uniformStatus}`);
  if (sections.length === 0) return null;

  return {
    title: "【東関東馬事学院】入学者情報のご案内",
    body:
      `${params.name}様\n\n入学に向けたご案内内容を更新しましたのでお知らせいたします。\n\n` +
      `${sections.join("\n\n")}\n\n` +
      `最新の内容はマイページの「入学者専用ページ」でもご確認いただけます。`,
  };
}

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
  const orientation_info = String(formData.get("orientation_info") ?? "").trim();
  const items_to_bring = String(formData.get("items_to_bring") ?? "").trim();
  const dorm_info = String(formData.get("dorm_info") ?? "").trim();
  const class_schedule = String(formData.get("class_schedule") ?? "").trim();
  const uniform_status = String(formData.get("uniform_status") ?? "").trim();
  const enrollment_date = String(formData.get("enrollment_date") ?? "").trim();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const parent_user_id = String(formData.get("parent_user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "") as StudentState;
  const notify = formData.get("notify") === "on";

  if (!id) return { error: "対象の生徒が不明です" };
  if (!name || !student_number) return { error: "氏名と学籍番号は必須です" };
  if (!VALID_STATES.includes(status)) return { error: "在籍状況の値が不正です" };

  // 本人アカウントは1生徒にのみ連携可能
  if (user_id) {
    const { data: linked } = await adminDb().from("students").select("id").eq("user_id", user_id).neq("id", id).limit(1);
    if (linked && linked.length > 0) return { error: "その本人アカウントは既に別の生徒に連携されています" };
  }

  const db = adminDb();
  const { data: updated, error } = await db
    .from("students")
    .update({
      name,
      kana: kana || null,
      student_number,
      class_name: class_name || null,
      dorm_room: dorm_room || null,
      assigned_horse_id: assigned_horse_id || null,
      stall_number: stall_number || null,
      orientation_info: orientation_info || null,
      items_to_bring: items_to_bring || null,
      dorm_info: dorm_info || null,
      class_schedule: class_schedule || null,
      uniform_status: uniform_status || null,
      enrollment_date: enrollment_date || null,
      user_id: user_id || null,
      parent_user_id: parent_user_id || null,
      status,
    })
    .eq("id", id)
    .select("lead_id, assigned_horse_id")
    .single();

  if (error?.code === "23505") return { error: "その学籍番号は既に登録されています" };
  if (error || !updated) return { error: "保存に失敗しました" };

  if (notify && updated.lead_id) {
    const [{ data: leadData }, { data: horseData }] = await Promise.all([
      db.from("leads").select("email, line_id").eq("id", updated.lead_id).maybeSingle(),
      updated.assigned_horse_id
        ? db.from("horses").select("name").eq("id", updated.assigned_horse_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const lead = leadData as Pick<Lead, "email" | "line_id"> | null;
    const horseName = (horseData as { name: string } | null)?.name ?? null;

    const message = composeEnrolleeInfoMessage({
      name,
      className: class_name || null,
      dormRoom: dorm_room || null,
      dormInfo: dorm_info || null,
      stallNumber: stall_number || null,
      horseName,
      orientationInfo: orientation_info || null,
      itemsToBring: items_to_bring || null,
      classSchedule: class_schedule || null,
      uniformStatus: uniform_status || null,
    });

    if (message && lead) {
      await notifyBoth(lead.email, lead.line_id, message.title, message.body, "enrollee_info");
      await db.from("students").update({ info_sent_at: new Date().toISOString() }).eq("id", id);
    }
  }

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/mypage/enrollee");
  return { ok: true };
}
