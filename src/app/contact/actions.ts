"use server";

import { adminDb } from "@/lib/supabase/admin";
import { notifyStaff, sendNotification } from "@/lib/notify";

export interface ContactState {
  ok?: boolean;
  error?: string;
}

const RELATIONSHIP_VALUES = new Set(["在校生", "保護者", "その他"]);

export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!name) return { error: "氏名を入力してください" };
  if (!relationship || !RELATIONSHIP_VALUES.has(relationship)) {
    return { error: "ご本人との続柄を選択してください" };
  }
  if (!birthDate) return { error: "生年月日を入力してください" };
  if (!email) return { error: "メールアドレスを入力してください" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません" };
  if (phone && !/^[\d\-＋+\s()]{8,20}$/.test(phone)) return { error: "電話番号の形式が正しくありません" };
  if (!remarks) return { error: "備考欄にご質問・ご相談内容を入力してください" };
  if (remarks.length > 5000) return { error: "備考欄は5000文字以内で入力してください" };

  const title = `【お問い合わせ】${name}様（${relationship}）より`;
  const body = `氏名: ${name}
ご本人との続柄: ${relationship}
生年月日: ${birthDate}
メールアドレス: ${email}
電話番号: ${phone || "未記入"}

----- お問い合わせ内容 -----
${remarks}
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

ご本人との続柄: ${relationship}
電話番号: ${phone || "未記入"}

----- お問い合わせ内容 -----
${remarks}

※このメールは自動送信です。
`,
      relatedType: "contact_inquiry_ack",
    });
  } catch (e) {
    console.error("[contact] お問い合わせ通知の送信に失敗:", e);
  }

  return { ok: true };
}
