"use client";

import { useActionState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { submitContactAction, type ContactState } from "./actions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

/** お問い合わせ送信者の区分（在校生・保護者など） */
const CONTACT_RELATIONSHIP_OPTIONS = ["在校生", "保護者", "その他"] as const;

/** 枠のない塗りつぶし入力欄 — 背景写真の上でも文字が読めるよう不透明に近い塗り */
const flatInputCls =
  "w-full border-0 bg-white/95 px-3.5 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300";

/** 背景写真の上でも読めるラベル：黒文字 + 背後の白いぼかし */
function ContactLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label
      className="mb-1 block text-xs font-semibold text-black"
      style={{
        textShadow:
          "0 0 6px #fff, 0 0 10px #fff, 0 0 14px rgba(255,255,255,0.9), 1px 0 3px #fff, -1px 0 3px #fff, 0 1px 3px #fff, 0 -1px 3px #fff",
      }}
    >
      {children}
      {required && (
        <span
          className="ml-1 text-red-600"
          style={{
            textShadow:
              "0 0 6px #fff, 0 0 10px #fff, 1px 0 3px #fff, -1px 0 3px #fff, 0 1px 3px #fff, 0 -1px 3px #fff",
          }}
        >
          *
        </span>
      )}
    </label>
  );
}

export default function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContactAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("お問い合わせを送信しました");
  }, [state]);

  if (state.ok) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
        <div className="bg-emerald-50 p-8 text-center shadow-sm sm:p-10">
          <p className="text-base font-bold text-emerald-800">お問い合わせを受け付けました</p>
          <p className="mt-2 text-sm leading-relaxed text-emerald-700">
            ご記入いただいたメールアドレス宛に受付確認をお送りしました。
            <br />
            担当者よりご連絡いたしますので、今しばらくお待ちください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-[6vw] py-14 sm:py-20">
      {/* 入力 → 送信完了 のステップ表示 */}
      <ul className="relative mx-auto mb-10 flex w-full max-w-xs items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-gray-300" />
        <li className="rounded-full bg-brand-600 px-6 py-2.5 text-center text-xs font-bold text-white">
          入力
        </li>
        <li className="rounded-full bg-gray-300 px-6 py-2.5 text-center text-xs font-bold text-white">
          送信完了
        </li>
      </ul>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <ContactLabel required>氏名</ContactLabel>
            <input name="name" required className={flatInputCls} placeholder="山田 太郎" autoComplete="name" />
          </div>
          <div>
            <ContactLabel required>ご本人との続柄</ContactLabel>
            <select name="relationship" required className={flatInputCls} defaultValue="">
              <option value="">選択してください</option>
              {CONTACT_RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <ContactLabel required>生年月日</ContactLabel>
            <input name="birth_date" type="date" required className={flatInputCls} />
          </div>
          <div>
            <ContactLabel>連絡先電話番号</ContactLabel>
            <input
              name="phone"
              type="tel"
              className={flatInputCls}
              placeholder="090-0000-0000"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          <div className="sm:col-span-2">
            <ContactLabel required>メールアドレス</ContactLabel>
            <input
              name="email"
              type="email"
              required
              className={flatInputCls}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <ContactLabel required>お問い合わせ内容</ContactLabel>
          <textarea
            name="remarks"
            required
            rows={7}
            className={flatInputCls}
            placeholder="ご質問・ご要望などあればご記入ください"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={pending}
            className="mx-auto flex min-h-[56px] w-full items-center justify-center gap-2 bg-brand-600 px-8 text-base font-bold text-white transition duration-300 ease-out hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-3/5"
          >
            {pending ? "送信中…" : "送信する"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-700 drop-shadow-sm">
          送信いただいた情報はお問い合わせ対応の目的にのみ使用します
        </p>
      </form>
    </div>
  );
}
