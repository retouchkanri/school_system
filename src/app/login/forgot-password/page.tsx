"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";
import SiteHeader from "@/components/site-header";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { btnPrimary, inputCls, Label } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    {}
  );

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("パスワード再設定のご案内をメールでお送りしました");
  }, [state]);

  return (
    <div className="min-h-screen bg-brand-50/40">
      <SiteHeader />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-gray-900">パスワードをお忘れの方</h1>
            <p className="mt-1 text-sm text-gray-500">
              ご登録のメールアドレス宛にパスワード再設定用のリンクをお送りします
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <form action={formAction} className="space-y-4">
              <div>
                <Label required>メールアドレス</Label>
                <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
              </div>
              <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
                {pending ? "送信中…" : "再設定リンクを送信"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              ログインへ戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
