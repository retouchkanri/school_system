"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { CAREER_OUTCOME_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { CareerOutcomeType, Student, Profile } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const OUTCOME_TYPES: CareerOutcomeType[] = ["employment", "further_education", "other"];

export async function createCareerRecord(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const student_id = String(formData.get("student_id") ?? "");
  const outcome_type = String(formData.get("outcome_type") ?? "") as CareerOutcomeType;
  const organization = String(formData.get("organization") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const decided_date = String(formData.get("decided_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const notify = formData.get("notify") === "on";

  if (!student_id) return { error: "生徒を選択してください" };
  if (!OUTCOME_TYPES.includes(outcome_type)) return { error: "区分を選択してください" };
  if (!organization) return { error: "就職先・進学先名を入力してください" };

  const db = adminDb();
  const { error } = await db.from("career_records").insert({
    student_id,
    outcome_type,
    organization,
    position: position || null,
    decided_date: decided_date || null,
    notes: notes || null,
    created_by: profile.id,
  });
  if (error) return { error: "登録に失敗しました" };

  if (notify) {
    const { data: studentData } = await db
      .from("students")
      .select("id, name, user_id, parent_user_id")
      .eq("id", student_id)
      .maybeSingle();
    const student = studentData as Pick<Student, "id" | "name" | "user_id" | "parent_user_id"> | null;
    if (student) {
      const recipientIds = [student.user_id, student.parent_user_id].filter((v): v is string => !!v);
      if (recipientIds.length > 0) {
        const { data: profilesData } = await db.from("profiles").select("*").in("id", recipientIds);
        const recipients = (profilesData ?? []) as Profile[];
        const label = CAREER_OUTCOME_LABELS[outcome_type];
        const title = `【東関東馬事学院】${student.name}さんの進路(${label})が決定しました`;
        const body = `${student.name}さんの進路が決定しましたのでお知らせします。\n\n区分: ${label}\n${
          outcome_type === "employment" ? "就職先" : outcome_type === "further_education" ? "進学先" : "内容"
        }: ${organization}${position ? `\n職種・コース: ${position}` : ""}${
          decided_date ? `\n決定日: ${fmtDate(decided_date)}` : ""
        }\n\n今後の詳細はマイページよりご確認ください。`;
        await Promise.all(recipients.map((r) => notifyBoth(r.email, r.line_id, title, body, "career_decided")));
      }
    }
  }

  revalidatePath("/admin/career");
  revalidatePath(`/admin/students/${student_id}`);
  revalidatePath("/student/career");
  revalidatePath("/parent/career");
  return { ok: true };
}
