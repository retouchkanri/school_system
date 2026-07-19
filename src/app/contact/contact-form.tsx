"use client";

import { useActionState, useEffect } from "react";
import { submitContactAction, type ContactState } from "./actions";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContactAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("お問い合わせを送信しました");
  }, [state]);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <p className="text-base font-bold text-emerald-800">お問い合わせを受け付けました</p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-700">
          ご記入いただいたメールアドレス宛に受付確認をお送りしました。
          <br />
          担当者よりご連絡いたしますので、今しばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
      <div>
        <Label required>お名前</Label>
        <input name="name" required className={inputCls} placeholder="山田 太郎" autoComplete="name" />
      </div>
      <div>
        <Label required>メールアドレス</Label>
        <input
          name="email"
          type="email"
          required
          className={inputCls}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <Label required>お問い合わせ内容</Label>
        <textarea
          name="message"
          required
          rows={6}
          className={inputCls}
          placeholder="ご質問・ご相談内容をご記入ください"
        />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
