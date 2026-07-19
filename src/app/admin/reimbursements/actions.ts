"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { fmtYen } from "@/lib/format";
import type { Reimbursement, Student, Profile } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

export async function createReimbursement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!student_id) return { error: "生徒を選択してください" };
  if (!title) return { error: "内容を入力してください" };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "金額を正しく入力してください" };

  const { error } = await adminDb().from("reimbursements").insert({
    student_id,
    title,
    amount: Math.round(amount),
    notes: notes || null,
    created_by: profile.id,
  });
  if (error) return { error: "登録に失敗しました" };

  revalidatePath("/admin/reimbursements");
  revalidatePath(`/admin/students/${student_id}`);
  return { ok: true };
}

async function studentRecipients(studentId: string): Promise<Profile[]> {
  const db = adminDb();
  const { data: studentData } = await db
    .from("students")
    .select("id, name, user_id, parent_user_id")
    .eq("id", studentId)
    .maybeSingle();
  const student = studentData as Pick<Student, "id" | "name" | "user_id" | "parent_user_id"> | null;
  if (!student) return [];
  const ids = [student.user_id, student.parent_user_id].filter((v): v is string => !!v);
  if (ids.length === 0) return [];
  const { data: profilesData } = await db.from("profiles").select("*").in("id", ids);
  return (profilesData ?? []) as Profile[];
}

/** 諸経費返金を本人・保護者へ通知する */
export async function notifyReimbursementAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = adminDb();
  const { data: reimbursementData } = await db.from("reimbursements").select("*").eq("id", id).maybeSingle();
  const reimbursement = reimbursementData as Reimbursement | null;
  if (!reimbursement || reimbursement.status !== "pending") return;

  const { data: studentData } = await db.from("students").select("name").eq("id", reimbursement.student_id).maybeSingle();
  const studentName = (studentData as Pick<Student, "name"> | null)?.name ?? "";

  const recipients = await studentRecipients(reimbursement.student_id);
  const title = `【東関東馬事学院】諸経費返金のお知らせ`;
  const body = `${studentName}さんの諸経費について、以下のとおり学校より返金いたします。\n\n内容: ${reimbursement.title}\n金額: ${fmtYen(reimbursement.amount)}${
    reimbursement.notes ? `\n備考: ${reimbursement.notes}` : ""
  }\n\n返金手続きが完了次第、改めてご連絡いたします。`;
  await Promise.all(recipients.map((r) => notifyBoth(r.email, r.line_id, title, body, "reimbursement")));

  await db.from("reimbursements").update({ status: "notified", notified_at: new Date().toISOString() }).eq("id", id);

  revalidatePath("/admin/reimbursements");
  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/students/${reimbursement.student_id}`);
}

/** 返金完了にする */
export async function markReimbursementPaidAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = adminDb();
  const { data: reimbursementData } = await db.from("reimbursements").select("student_id, status").eq("id", id).maybeSingle();
  const reimbursement = reimbursementData as Pick<Reimbursement, "student_id" | "status"> | null;
  if (!reimbursement || reimbursement.status === "paid") return;

  await db.from("reimbursements").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);

  revalidatePath("/admin/reimbursements");
  revalidatePath(`/admin/students/${reimbursement.student_id}`);
}
