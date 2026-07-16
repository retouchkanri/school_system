"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { APPLICATION_DOCUMENTS } from "@/lib/constants";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 出願の提出 (提出書類の自己申告 + 作文) */
export async function submitApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const documents: Record<string, boolean> = {};
  for (const doc of APPLICATION_DOCUMENTS) {
    documents[doc.key] = formData.get(`doc_${doc.key}`) === "on";
  }
  const essay = String(formData.get("essay") ?? "").trim();
  if (!essay) return { error: "作文をご記入ください" };

  const { error } = await adminDb()
    .from("applications")
    .upsert(
      {
        lead_id: lead.id,
        documents,
        essay,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
  if (error) return { error: "出願の保存に失敗しました" };

  await advanceLeadStatus(lead.id, "applied");
  await notifyBoth(
    lead.email,
    lead.line_id,
    "【東関東馬事学院】出願を受け付けました",
    `${lead.name}様\n\n出願を受け付けました。ありがとうございます。\n提出書類が郵送でまだの場合は、お早めにご送付ください。\n\n続いて、マイページより性格・適性検査(96問)の受検をお願いいたします。\n面接日程は決まり次第マイページでご案内します。`,
    "application"
  );

  revalidatePath("/mypage/application");
  revalidatePath("/mypage");
  return { ok: true };
}
