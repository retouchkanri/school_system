"use server";

import { redirect } from "next/navigation";
import { adminDb } from "@/lib/supabase/admin";
import { sendNotification, publicFileAttachment } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { INTRO_VIDEO_URL } from "@/lib/constants";

export interface RequestState {
  error?: string;
}

const WELCOME_BODY = (name: string, birthDateLogin: boolean, email: string, origin: string) => {
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
  birthDateLogin
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
  const password = birthDate.replaceAll("-", ""); // 初回ログイン用パスワード = 生年月日(8桁)
  const { data: existingProfile } = await db
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  let userId: string | null = (existingProfile as { id: string; role: string } | null)?.id ?? null;
  const existingRole = (existingProfile as { role: string } | null)?.role ?? null;
  /** 生年月日(8桁)でログインできる状態か。メール本文の案内を切り替えるために使う */
  let birthDateLogin = false;

  if (!userId) {
    const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created?.user && !createError) {
      userId = created.user.id;
      birthDateLogin = true;
      const { error: profileError } = await db
        .from("profiles")
        .insert({ id: userId, role: "applicant", full_name: name, email, phone: String(formData.get("phone") ?? "") || null });
      if (profileError) {
        // profiles 作成失敗時は auth 側の孤児ユーザーを残さない (残ると同メールで恒久的に再登録不能になる)
        await db.auth.admin.deleteUser(userId);
        userId = null;
        birthDateLogin = false;
      }
    }
  } else if (existingRole === "applicant") {
    // 既存の入学希望者アカウントに資料請求が届いた場合:
    // 案内メールは「生年月日でログイン」と伝えるため、実際のパスワードも生年月日に合わせて再設定する。
    // (対象は applicant のみ。職員・在校生等の独自パスワードは決して上書きしない)
    const { error: pwErr } = await db.auth.admin.updateUserById(userId, { password });
    if (!pwErr) birthDateLogin = true;
  }

  if (userId) {
    await db.from("leads").update({ user_id: userId }).eq("id", lead.id);
  }

  // 資料請求の受付確認 + マイページ案内 + 2つのフォーム(添付)+ 紹介動画URL を自動送信。
  // ※ 応答後(after)ではなく await で送信する: サーバーレス環境では応答後に関数が凍結され、
  //    SMTP送信が完了しないためメールが届かない (今回の不具合の主因)。
  const origin = await siteOrigin();
  const attachments = await Promise.all([
    publicFileAttachment("docs/pre-screening-form.docx", "入学仮審査(お試し)フォーム.docx", origin),
    publicFileAttachment("docs/school-tour-form.docx", "学校見学お申し込みフォーム.docx", origin),
  ]);
  try {
    await sendNotification({
      channel: "email",
      recipient: email,
      title: "【東関東馬事学院】資料請求ありがとうございます",
      body: WELCOME_BODY(name, birthDateLogin, email, origin),
      relatedType: "material_request",
      attachments,
    });
  } catch (e) {
    // メール送信の失敗で登録処理(リダイレクト)を止めない。原因はログに残す。
    console.error("[request] 資料請求受付メールの送信に失敗:", e);
  }

  redirect("/login?registered=1");
}
