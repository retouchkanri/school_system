"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";
import SiteLogo from "@/components/site-logo";
import { btnPrimary, inputCls, Label } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <SiteLogo className="mx-auto inline-block" />
          <p className="mt-3 text-sm text-gray-500">統合管理システム ログイン</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <form action={formAction} className="space-y-4">
            <div>
              <Label required>メールアドレス</Label>
              <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <Label required>パスワード</Label>
              <input name="password" type="password" required className={inputCls} placeholder="••••••••" />
            </div>
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
            )}
            <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
              {pending ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          はじめての方は{" "}
          <Link href="/request" className="font-semibold text-brand-600 hover:underline">
            資料請求フォーム
          </Link>{" "}
          へ
        </p>
      </div>
    </div>
  );
}
