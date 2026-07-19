"use server";

import crypto from "crypto";
import { after } from "next/server";
import { adminDb } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";

export interface ForgotPasswordState {
  ok?: boolean;
  error?: string;
}

const RESET_EMAIL_BODY = (resetUrl: string) => `パスワード再設定のご案内です。

以下のリンクから新しいパスワードを設定してください。
このリンクの有効期限は1時間です。

${resetUrl}

心当たりがない場合は、このメールを破棄してください。`;

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "メールアドレスを入力してください" };

  const db = adminDb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();

  if (profile) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.from("password_reset_tokens").insert({
      user_id: (profile as { id: string }).id,
      token,
      expires_at: expiresAt,
    });

    const resetUrl = `${await siteOrigin()}/login/reset-password?token=${token}`;
    after(() =>
      sendNotification({
        channel: "email",
        recipient: email,
        title: "【東関東馬事学院】パスワード再設定のご案内",
        body: RESET_EMAIL_BODY(resetUrl),
        relatedType: "password_reset",
      })
    );
  }

  // メールアドレスの存在有無に関わらず同じメッセージを返す(メールアドレス総当たり対策)
  return { ok: true };
}
