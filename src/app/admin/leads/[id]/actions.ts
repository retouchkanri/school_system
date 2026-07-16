"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { advanceLeadStatus } from "@/lib/data";
import { notifyBoth } from "@/lib/notify";
import { analyzePreScreening } from "@/lib/ai";
import { PROGRESS_STEPS } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import type { Lead, PreScreeningSurvey } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  password?: string;
}

function revalidateLead(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

/** 管理カード: 資料送付日・ステータス・担当者の更新 */
export async function updateLeadAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  const materialSentDate = String(formData.get("material_sent_date") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const assignedStaff = String(formData.get("assigned_staff") ?? "").trim();

  if (!leadId) return { error: "リードIDが不正です" };
  if (!PROGRESS_STEPS.some((s) => s.key === status)) return { error: "ステータスが不正です" };

  const { error } = await adminDb()
    .from("leads")
    .update({
      material_sent_date: materialSentDate || null,
      status,
      assigned_staff: assignedStaff || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) return { error: "保存に失敗しました" };

  revalidateLead(leadId);
  return { ok: true, message: "管理情報を保存しました" };
}

/** 「資料発送済にする」: 送付日=今日 + ステータス前進 + メール/LINE通知 */
export async function markMaterialSentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { error: "リードIDが不正です" };

  const { data } = await adminDb().from("leads").select("*").eq("id", leadId).maybeSingle();
  const lead = data as Lead | null;
  if (!lead) return { error: "リードが見つかりません" };

  const { error } = await adminDb()
    .from("leads")
    .update({ material_sent_date: toDateInput(), updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) return { error: "更新に失敗しました" };

  await advanceLeadStatus(leadId, "material_sent");
  await notifyBoth(
    lead.email,
    lead.line_id,
    "【東関東馬事学院】資料を発送しました",
    `${lead.name} 様\n\nご請求いただいたパンフレット一式を本日発送いたしました。到着まで数日お待ちください。\n` +
      `お手元に届きましたら、マイページより学院紹介動画のご視聴と入学仮審査アンケートへのご回答をお願いいたします。`,
    "material_sent"
  );

  revalidateLead(leadId);
  return { ok: true, message: "資料発送済にして通知を送信しました" };
}

/** 仮審査アンケートのAI判定を実行 */
export async function runAiJudgementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { error: "リードIDが不正です" };

  const { data } = await adminDb().from("pre_screening_surveys").select("*").eq("lead_id", leadId).maybeSingle();
  const survey = data as PreScreeningSurvey | null;
  if (!survey) return { error: "仮審査アンケートが未回答のため判定できません" };

  const result = await analyzePreScreening(survey.answers);
  const { error } = await adminDb()
    .from("leads")
    .update({
      ai_type: result.type,
      ai_summary: result.summary,
      ai_judgement: result.judgement,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (error) return { error: "AI判定結果の保存に失敗しました" };

  await advanceLeadStatus(leadId, "ai_judged");
  revalidateLead(leadId);
  return { ok: true, message: `AI判定が完了しました(${result.type})` };
}

/** メモ欄の更新 */
export async function updateNotesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!leadId) return { error: "リードIDが不正です" };

  const { error } = await adminDb()
    .from("leads")
    .update({ notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) return { error: "メモの保存に失敗しました" };

  revalidateLead(leadId);
  return { ok: true, message: "メモを保存しました" };
}

/** マイページアカウント発行: Authユーザー + profiles(applicant) 作成 + 仮パスワード通知 */
export async function createMypageAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { error: "リードIDが不正です" };

  const db = adminDb();
  const { data } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
  const lead = data as Lead | null;
  if (!lead) return { error: "リードが見つかりません" };
  if (lead.user_id) return { error: "すでにマイページアカウントが発行されています" };
  if (!lead.email) return { error: "メールアドレスが未登録のため発行できません" };

  const password = `baji${Math.floor(10000000 + Math.random() * 90000000)}`;
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: lead.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { error: "アカウント作成に失敗しました(既に同じメールのユーザーが存在する可能性があります)" };
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    role: "applicant",
    full_name: lead.name,
    email: lead.email,
    phone: lead.phone,
    line_id: lead.line_id,
  });
  if (profileError) return { error: "プロフィールの作成に失敗しました" };

  const { error: linkError } = await db
    .from("leads")
    .update({ user_id: created.user.id, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (linkError) return { error: "リードとの紐付けに失敗しました" };

  await notifyBoth(
    lead.email,
    lead.line_id,
    "【東関東馬事学院】マイページアカウント発行のお知らせ",
    `${lead.name} 様\n\nマイページアカウントを発行しました。以下の情報でログインしてください。\n` +
      `ログインID: ${lead.email}\n仮パスワード: ${password}\n\n` +
      `マイページでは学院紹介動画の視聴、入学仮審査アンケート、見学予約、出願のお手続きができます。`,
    "account_issued"
  );

  revalidateLead(leadId);
  return { ok: true, message: "マイページアカウントを発行しました", password };
}
