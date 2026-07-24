"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { DEFAULT_STUDENT_SURVEY_QUESTIONS } from "@/lib/constants";
import type { Student, StudentSurvey, Profile } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

export async function createSurvey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const target = String(formData.get("target") ?? "");

  if (!title) return { error: "タイトルを入力してください" };
  if (target !== "students" && target !== "parents") return { error: "対象の値が不正です" };

  const { error } = await adminDb().from("student_surveys").insert({
    title,
    description: description || null,
    target,
    questions: DEFAULT_STUDENT_SURVEY_QUESTIONS,
    active: true,
  });

  if (error) return { error: "作成に失敗しました" };

  revalidatePath("/admin/surveys");
  return { ok: true };
}

/** 受付中/終了の切り替え */
export async function toggleSurveyActive(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) return;

  await adminDb().from("student_surveys").update({ active: next }).eq("id", id);
  revalidatePath("/admin/surveys");
}

/** 対象者 (在校生 or 保護者) へ回答依頼を配信する */
export async function deliverSurvey(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = adminDb();
  const { data: surveyData } = await db.from("student_surveys").select("*").eq("id", id).maybeSingle();
  const survey = surveyData as StudentSurvey | null;
  if (!survey || !survey.active) return; // 終了済みアンケートは配信不可 (サーバー側でも検証)

  const { data: studentsData } = await db.from("students").select("*").eq("status", "enrolled");
  const students = (studentsData ?? []) as Student[];

  const userIds = [
    ...new Set(
      students
        .map((s) => (survey.target === "parents" ? s.parent_user_id : s.user_id))
        .filter((v): v is string => !!v)
    ),
  ];
  if (userIds.length === 0) return;

  const { data: profilesData } = await db.from("profiles").select("*").in("id", userIds);
  const profiles = (profilesData ?? []) as Profile[];

  const targetLabel = survey.target === "parents" ? "保護者" : "在校生";
  const body = `${targetLabel}向け定期アンケート「${survey.title}」への回答をお願いします。${
    survey.description ? `\n${survey.description}` : ""
  }\nポータルにログインのうえ、ご回答ください。`;

  await Promise.all(
    profiles.map((p) =>
      notifyBoth(p.email, p.line_id, `【東関東馬事学院】アンケート「${survey.title}」回答のお願い`, body, "survey_request")
    )
  );

  revalidatePath("/admin/surveys");
  revalidatePath("/admin/notifications");
}
