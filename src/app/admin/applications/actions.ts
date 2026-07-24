"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { fmtDate } from "@/lib/format";
import type { Lead } from "@/lib/types";

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
    .select("id, lead_id, status, interview_date")
    .eq("id", applicationId)
    .single();
  const app = data as { id: string; lead_id: string; status: string; interview_date: string | null } | null;
  if (!app) return { error: "対象の出願が見つかりません" };

  const update: Record<string, string> = { status };
  if (status === "interview_scheduled" && interviewDate) update.interview_date = interviewDate;

  const { error } = await db.from("applications").update(update).eq("id", applicationId);
  if (error) return { error: "更新に失敗しました" };

  if (status === "interview_scheduled") {
    await advanceLeadStatus(app.lead_id, "interview");

    // 面接日の確定・変更を本人へメール+LINEで通知する (初回の日程確定時、または日付変更時)
    if (interviewDate && (app.status !== "interview_scheduled" || interviewDate !== app.interview_date)) {
      const { data: leadData } = await db.from("leads").select("name, email, line_id").eq("id", app.lead_id).maybeSingle();
      const lead = leadData as Pick<Lead, "name" | "email" | "line_id"> | null;
      if (lead) {
        await notifyBoth(
          lead.email,
          lead.line_id,
          "【東関東馬事学院】面接日程のご案内",
          `${lead.name}様\n\n出願書類を確認いたしました。面接日程が下記のとおり確定しましたのでご案内いたします。\n\n面接日: ${fmtDate(interviewDate)}\n\n当日の詳細(時間・持ち物など)は追ってご連絡いたします。ご不明な点があればお気軽にお問い合わせください。`,
          "interview_scheduled"
        );
      }
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/notifications");
  return { ok: true };
}
