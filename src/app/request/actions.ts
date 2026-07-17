"use server";

import { headers } from "next/headers";
import { adminDb } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notify";

export interface RequestState {
  ok?: boolean;
  error?: string;
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const WELCOME_BODY = (name: string, isNewAccount: boolean, email: string, loginUrl: string) => `${name}様

この度は、本校への資料をご請求して頂きまして誠にありがとうございます。
${name}様には、以下3つの情報をご用意しましたので、お届けいたします。

(1) 学校の紹介ビデオ(5分程度)
(2) 入学仮審査(お試し)フォーム
(3) 学校見学お申し込みフォーム

マイページにログインして頂くと、上記3つがご利用いただけます。

■ ログイン方法
ログインURL: ${loginUrl}
メールアドレス: ${email}
${
  isNewAccount
    ? "パスワード: ご入力いただいた生年月日(半角数字8桁 例:20250102)"
    : "パスワード: 既にお持ちのアカウントのパスワードでログインしてください"
}

パスワードはログイン後、マイページの「アカウント設定」からいつでも変更いただけます。

パンフレットは追ってご郵送いたします。到着まで今しばらくお待ちください。`;

export async function submitRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  if (!name || !email) return { error: "氏名とメールアドレスは必須です" };
  if (!birthDate) return { error: "生年月日は必須です(マイページの初回ログインパスワードに使用します)" };

  const jobs = formData.getAll("interested_jobs").map(String);
  const lineId = String(formData.get("line_id") ?? "").trim();

  const { data: lead, error } = await adminDb()
    .from("leads")
    .insert({
      name,
      kana: String(formData.get("kana") ?? "") || null,
      grade: String(formData.get("grade") ?? "") || null,
      birth_date: birthDate,
      gender: String(formData.get("gender") ?? "") || null,
      school_name: String(formData.get("school_name") ?? "") || null,
      guardian_name: String(formData.get("guardian_name") ?? "") || null,
      postal_code: String(formData.get("postal_code") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email,
      line_id: lineId || null,
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

  // マイページアカウントの自動発行・自動紐付け
  const db = adminDb();
  const { data: existingProfile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();

  let userId: string | null = (existingProfile as { id: string } | null)?.id ?? null;
  let isNewAccount = !userId;

  if (!userId) {
    const password = birthDate.replaceAll("-", "");
    const { data: created } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created?.user) {
      userId = created.user.id;
      isNewAccount = true;
      await db.from("profiles").insert({ id: userId, role: "applicant", full_name: name, email, phone: String(formData.get("phone") ?? "") || null, line_id: lineId || null });
    }
  }

  if (userId) {
    await db.from("leads").update({ user_id: userId }).eq("id", lead.id);
  }

  // 資料請求の受付確認 + マイページ案内をメール(+LINE登録があればLINE)で自動送信
  const loginUrl = `${await siteOrigin()}/login`;
  await sendNotification({
    channel: "email",
    recipient: email,
    title: "【東関東馬事学院】資料請求ありがとうございます",
    body: WELCOME_BODY(name, isNewAccount, email, loginUrl),
    relatedType: "material_request",
  });
  if (lineId) {
    await sendNotification({
      channel: "line",
      recipient: lineId,
      title: "資料請求ありがとうございます",
      body: "パンフレットを発送いたします。マイページにログインすると、学院紹介動画・入学仮審査アンケート・学校見学お申し込みがご利用いただけます。",
      relatedType: "material_request",
    });
  }

  return { ok: true };
}
