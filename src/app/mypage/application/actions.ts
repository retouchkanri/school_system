"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { APPLICATION_FILE_DOCUMENTS } from "@/lib/constants";
import { uploadApplicationDocument } from "@/lib/documents";
import type { ApplicationDocumentFile } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** 出願の提出 (提出書類のアップロード + 作文) */
export async function submitApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const documents: Record<string, ApplicationDocumentFile> = {};
  for (const doc of APPLICATION_FILE_DOCUMENTS) {
    const file = formData.get(`doc_${doc.key}`);
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadApplicationDocument(profile.id, doc.key, file);
      if ("error" in uploaded) return { error: `${doc.label}: ${uploaded.error}` };
      documents[doc.key] = uploaded;
    }
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
    `${lead.name}様\n\n出願を受け付けました。ありがとうございます。\n提出書類が郵送でまだの場合は、お早めにご送付ください。\n\n続いて、マイページより性格・適性検査(100問)の受検をお願いいたします。\n面接日程は決まり次第マイページでご案内します。`,
    "application"
  );

  revalidatePath("/mypage/application");
  revalidatePath("/mypage");
  return { ok: true };
}

/** 提出済み出願がロックされているか (合否確定後は編集不可) */
async function getEditableApplication(leadId: string) {
  const { data } = await adminDb()
    .from("applications")
    .select("id, documents, status")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (!data) return { error: "出願が見つかりません" } as const;
  if (data.status === "decided") return { error: "選考結果が確定しているため編集できません" } as const;
  return { data } as const;
}

/** 提出済み書類1件の再アップロード (差し替え) */
export async function updateApplicationDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const docKey = String(formData.get("doc_key") ?? "");
  const doc = APPLICATION_FILE_DOCUMENTS.find((d) => d.key === docKey);
  if (!doc) return { error: "不正な書類指定です" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ファイルを選択してください" };

  const current = await getEditableApplication(lead.id);
  if ("error" in current) return { error: current.error };

  const uploaded = await uploadApplicationDocument(profile.id, doc.key, file);
  if ("error" in uploaded) return { error: `${doc.label}: ${uploaded.error}` };

  const documents = { ...current.data.documents, [doc.key]: uploaded };
  const { error } = await adminDb().from("applications").update({ documents }).eq("id", current.data.id);
  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/mypage/application");
  return { ok: true };
}

/** 提出済み作文の編集 */
export async function updateApplicationEssayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { error: "リード情報が見つかりません" };

  const essay = String(formData.get("essay") ?? "").trim();
  if (!essay) return { error: "作文をご記入ください" };

  const current = await getEditableApplication(lead.id);
  if ("error" in current) return { error: current.error };

  const { error } = await adminDb().from("applications").update({ essay }).eq("id", current.data.id);
  if (error) return { error: "更新に失敗しました" };

  revalidatePath("/mypage/application");
  return { ok: true };
}
