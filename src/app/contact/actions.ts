"use server";

import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff, sendNotification } from "@/lib/notify";

export interface ContactState {
  ok?: boolean;
  error?: string;
}

export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { error: "お名前を入力してください" };
  if (!email) return { error: "メールアドレスを入力してください" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません" };
  if (!message) return { error: "お問い合わせ内容を入力してください" };
  if (message.length > 5000) return { error: "お問い合わせ内容は5000文字以内で入力してください" };

  const title = `【お問い合わせ】${name}様より`;
  const body = `お名前: ${name}
メールアドレス: ${email}

----- お問い合わせ内容 -----
${message}
`;

  // 職員へ通知 + 送信者へ受付メール。
  // ※ 応答後(after)ではなく await で送信する (サーバーレスでは応答後に送信が完了しないため)。
  try {
    const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
    const adminEmails = ((adminsData ?? []) as { email: string | null }[])
      .map((a) => a.email)
      .filter(Boolean) as string[];

    await notifyStaff(title, body, "contact_inquiry", adminEmails);

    await sendNotification({
      channel: "email",
      recipient: email,
      title: "【東関東馬事学院】お問い合わせを受け付けました",
      body: `${name}様

お問い合わせありがとうございます。
以下の内容で受付いたしました。担当者よりご連絡いたしますので、今しばらくお待ちください。

----- お問い合わせ内容 -----
${message}

※このメールは自動送信です。
`,
      relatedType: "contact_inquiry_ack",
    });
  } catch (e) {
    console.error("[contact] お問い合わせ通知の送信に失敗:", e);
  }

  return { ok: true };
}
