"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { adminDb } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { INTRO_VIDEO_URL } from "@/lib/constants";

export interface RequestState {
  error?: string;
}

const WELCOME_BODY = (name: string, isNewAccount: boolean, email: string, origin: string) => {
  const loginUrl = `${origin}/login`;
  const surveyUrl = `${origin}/mypage/survey`;
  const eventsUrl = `${origin}/mypage/events`;
  return `${name}様

この度は、本校への資料をご請求して頂きまして誠にありがとうございます。
${name}様には、以下3つの情報をご用意しましたので、お届けいたします。

(1) 学校の紹介ビデオ(5分程度)
    ${INTRO_VIDEO_URL}
(2) 入学仮審査(お試し)フォーム
    ${surveyUrl}
(3) 学校見学お申し込みフォーム
    ${eventsUrl}

マイページにログインして頂くと、上記3つをまとめてご利用いただけます。
※ (1)の動画は上記URLからそのままご覧いただけます。(2)(3)のフォームはログイン後にご利用いただけます。

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
};

export async function submitRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  if (!name || !email) return { error: "氏名とメールアドレスは必須です" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません" };
  if (!birthDate) return { error: "生年月日は必須です(マイページの初回ログインパスワードに使用します)" };

  const { data: lead, error } = await adminDb()
    .from("leads")
    .insert({
      name,
      kana: String(formData.get("kana") ?? "") || null,
      relationship: String(formData.get("relationship") ?? "") || null,
      birth_date: birthDate,
      postal_code: String(formData.get("postal_code") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email,
      remarks: String(formData.get("remarks") ?? "") || null,
      status: "material_requested",
    })
    .select("id")
    .single();

  if (error || !lead) return { error: "送信に失敗しました。時間をおいて再度お試しください。" };

  // マイページアカウントの自動発行・自動紐付け
  const db = adminDb();
  const { data: existingProfile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();

  let userId: string | null = (existingProfile as { id: string } | null)?.id ?? null;
  let isNewAccount = false;

  if (!userId) {
    const password = birthDate.replaceAll("-", "");
    const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created?.user && !createError) {
      userId = created.user.id;
      isNewAccount = true;
      const { error: profileError } = await db
        .from("profiles")
        .insert({ id: userId, role: "applicant", full_name: name, email, phone: String(formData.get("phone") ?? "") || null });
      if (profileError) {
        // profiles 作成失敗時は auth 側の孤児ユーザーを残さない (残ると同メールで恒久的に再登録不能になる)
        await db.auth.admin.deleteUser(userId);
        userId = null;
        isNewAccount = false;
      }
    }
  }

  if (userId) {
    await db.from("leads").update({ user_id: userId }).eq("id", lead.id);
  }

  // 資料請求の受付確認 + マイページ案内をメールで自動送信 (SMTP遅延でリダイレクトをブロックしないよう応答後に送信)
  const origin = await siteOrigin();
  after(() =>
    sendNotification({
      channel: "email",
      recipient: email,
      title: "【東関東馬事学院】資料請求ありがとうございます",
      body: WELCOME_BODY(name, isNewAccount, email, origin),
      relatedType: "material_request",
    })
  );

  redirect("/login?registered=1");
}
