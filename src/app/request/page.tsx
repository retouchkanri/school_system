"use client";

import { useActionState, useEffect } from "react";
import { submitRequestAction, type RequestState } from "./actions";
import SiteHeader from "@/components/site-header";
import { showErrorToast } from "@/lib/toast";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import { RELATIONSHIP_OPTIONS } from "@/lib/constants";

export default function RequestPage() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(submitRequestAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
  }, [state]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner-talk.jpg"
          alt="馬と話すこと。"
          className="mb-6 h-36 w-full rounded-xl object-cover shadow-sm sm:h-44"
        />
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">資料請求フォーム</h1>
          <p className="mt-1 text-sm text-gray-500">
            東関東馬事高等学院・東関東馬事専門学院のパンフレットを無料でお送りします
          </p>
        </div>

        <form action={formAction} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>氏名</Label>
              <input name="name" required className={inputCls} placeholder="山田 太郎" />
            </div>
            <div>
              <Label>フリガナ</Label>
              <input name="kana" className={inputCls} placeholder="ヤマダ タロウ" />
            </div>
            <div>
              <Label>ご本人との続柄</Label>
              <select name="relationship" className={inputCls} defaultValue="">
                <option value="">選択してください</option>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label required>生年月日</Label>
              <input name="birth_date" type="date" required className={inputCls} />
              <p className="mt-1 text-[11px] text-gray-400">マイページの初回ログインパスワードとして使用します</p>
            </div>
            <div>
              <Label>郵便番号</Label>
              <input name="postal_code" className={inputCls} placeholder="283-0000" />
            </div>
            <div className="sm:col-span-2">
              <Label>住所</Label>
              <input name="address" className={inputCls} placeholder="千葉県東金市…" />
            </div>
            <div>
              <Label>連絡先電話番号</Label>
              <input name="phone" className={inputCls} placeholder="090-0000-0000" />
            </div>
            <div>
              <Label required>メールアドレス</Label>
              <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <Label>備考欄</Label>
            <textarea name="remarks" rows={3} className={inputCls} placeholder="ご質問・ご要望などあればご記入ください" />
          </div>

          <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
            {pending ? "送信中…" : "資料請求する(無料)"}
          </button>
          <p className="text-center text-xs text-gray-400">
            送信いただいた情報は入学案内の目的にのみ使用します
          </p>
        </form>
      </div>
    </div>
  );
}
