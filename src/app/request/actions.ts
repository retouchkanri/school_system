"use server";

import { adminDb } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notify";

export interface RequestState {
  ok?: boolean;
  error?: string;
}

export async function submitRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return { error: "氏名とメールアドレスは必須です" };

  const jobs = formData.getAll("interested_jobs").map(String);

  const { data: lead, error } = await adminDb()
    .from("leads")
    .insert({
      name,
      kana: String(formData.get("kana") ?? "") || null,
      grade: String(formData.get("grade") ?? "") || null,
      birth_date: String(formData.get("birth_date") ?? "") || null,
      gender: String(formData.get("gender") ?? "") || null,
      school_name: String(formData.get("school_name") ?? "") || null,
      guardian_name: String(formData.get("guardian_name") ?? "") || null,
      postal_code: String(formData.get("postal_code") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email,
      line_id: String(formData.get("line_id") ?? "") || null,
      desired_course: String(formData.get("desired_course") ?? "") || null,
      interested_jobs: jobs.length ? jobs : null,
      horse_experience: formData.get("horse_experience") === "yes",
      horse_experience_detail: String(formData.get("horse_experience_detail") ?? "") || null,
      referral_source: String(formData.get("referral_source") ?? "") || null,
      status: "material_requested",
    })
    .select("id")
    .single();

  if (error || !lead) return { error: "送信に失敗しました。時間をおいて再度お試しください。" };

  // 資料請求の受付確認をメール(+LINE登録があればLINE)で自動送信
  await sendNotification({
    channel: "email",
    recipient: email,
    title: "【東関東馬事学院】資料請求ありがとうございます",
    body: `${name}様\n\n資料請求を受け付けました。パンフレットを発送いたします。\n発送後、学院紹介動画と入学仮審査アンケートのご案内をお送りします。`,
    relatedType: "material_request",
  });
  const lineId = String(formData.get("line_id") ?? "");
  if (lineId) {
    await sendNotification({
      channel: "line",
      recipient: lineId,
      title: "資料請求ありがとうございます",
      body: "パンフレットを発送いたします。続いて学院紹介動画をご覧ください🐴",
      relatedType: "material_request",
    });
  }

  return { ok: true };
}
