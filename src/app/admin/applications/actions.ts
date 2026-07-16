"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";

export interface ApplicationActionState {
  ok?: boolean;
  error?: string;
}

/** 出願ステータス変更 (審査中 / 面接日程確定 + 面接日) */
export async function updateApplicationStatusAction(
  _prev: ApplicationActionState,
  formData: FormData
): Promise<ApplicationActionState> {
  await requireRole("admin");

  const applicationId = String(formData.get("application_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const interviewDate = String(formData.get("interview_date") ?? "");

  if (!applicationId) return { error: "対象の出願が見つかりません" };
  if (status !== "under_review" && status !== "interview_scheduled") {
    return { error: "ステータスの指定が不正です" };
  }
  if (status === "interview_scheduled" && !interviewDate) {
    return { error: "面接日程確定にする場合は面接日を入力してください" };
  }

  const db = adminDb();
  const { data } = await db
    .from("applications")
    .select("id, lead_id")
    .eq("id", applicationId)
    .single();
  const app = data as { id: string; lead_id: string } | null;
  if (!app) return { error: "対象の出願が見つかりません" };

  const update: Record<string, string> = { status };
  if (interviewDate) update.interview_date = interviewDate;

  const { error } = await db.from("applications").update(update).eq("id", applicationId);
  if (error) return { error: "更新に失敗しました" };

  if (status === "interview_scheduled") {
    await advanceLeadStatus(app.lead_id, "interview");
  }

  revalidatePath("/admin/applications");
  return { ok: true };
}
