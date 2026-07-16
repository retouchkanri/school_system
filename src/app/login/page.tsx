"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "./actions";
import { btnPrimary, inputCls, Label } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { label: "管理者(職員)", email: "admin@bajigakuin.jp", password: "admin123456" },
  { label: "入学希望者", email: "applicant@example.com", password: "applicant123" },
  { label: "在校生", email: "student1@example.com", password: "student123" },
  { label: "保護者", email: "parent1@example.com", password: "parent123" },
  { label: "一口支援者", email: "supporter1@example.com", password: "supporter123" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="馬事学院/東関東馬事専門学院" className="mx-auto h-12 w-auto" />
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

        <details className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <summary className="cursor-pointer font-semibold text-gray-700">デモアカウント一覧</summary>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-700">{a.label}</span>
                <code className="text-xs text-gray-500">
                  {a.email} / {a.password}
                </code>
              </li>
            ))}
          </ul>
        </details>

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
