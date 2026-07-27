"use client";

import { Suspense, useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { btnPrimary, btnSecondary, inputCls, Label } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

function RegisteredToastNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      showSuccessToast("資料請求を受け付けました。メールアドレスと生年月日でログインしてください。");
      router.replace("/login");
    } else if (searchParams.get("reset") === "1") {
      showSuccessToast("パスワードを再設定しました。新しいパスワードでログインしてください。");
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <Label required>メールアドレス</Label>
        <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
      </div>
      <div>
        <Label required>生年月日 / パスワード</Label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className={`${inputCls} pr-10`}
            placeholder="初回ログインは生年月日 例:20040212"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "隠す" : "表示する"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-right text-xs">
          <Link href="/login/forgot-password" className="text-brand-600 hover:underline">
            パスワードをお忘れですか？
          </Link>
        </p>
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}

export default function LoginContent() {
  return (
    <>
      <Suspense fallback={null}>
        <RegisteredToastNotice />
      </Suspense>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-gray-900">ログイン</h1>
            <p className="mt-1 text-sm text-gray-500">統合管理システム</p>
          </div>

          <div className="border border-gray-200 bg-white p-6 shadow-lg">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">資料請求がまだの方はこちら</p>
            <Link href="/request" className={`${btnSecondary} mt-2 w-full`}>
              資料請求フォームへ戻る
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
