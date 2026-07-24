"use server";

import crypto from "crypto";
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
    // DBにはハッシュのみ保存 (DB流出時にトークンでの乗っ取りを防ぐ)。メールには生トークンを記載する。
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.from("password_reset_tokens").insert({
      user_id: (profile as { id: string }).id,
      token: tokenHash,
      expires_at: expiresAt,
    });

    // ※ 応答後(after)ではなく await で送信する (サーバーレスでは応答後に送信が完了しないため)。
    const resetUrl = `${await siteOrigin()}/login/reset-password?token=${token}`;
    try {
      await sendNotification({
        channel: "email",
        recipient: email,
        title: "【東関東馬事学院】パスワード再設定のご案内",
        body: RESET_EMAIL_BODY(resetUrl),
        relatedType: "password_reset",
      });
    } catch (e) {
      console.error("[forgot-password] 再設定メールの送信に失敗:", e);
    }
  }

  // メールアドレスの存在有無に関わらず同じメッセージを返す(メールアドレス総当たり対策)
  return { ok: true };
}
