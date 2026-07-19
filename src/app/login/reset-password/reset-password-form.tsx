"use client";

import { useEffect, useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "./actions";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(resetPasswordAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("パスワードを再設定しました");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label required>新しいパスワード</Label>
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="8文字以上" />
      </div>
      <div>
        <Label required>新しいパスワード(確認)</Label>
        <input
          name="password_confirmation"
          type="password"
          required
          minLength={8}
          className={inputCls}
          placeholder="8文字以上"
        />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "更新中…" : "パスワードを更新する"}
      </button>
    </form>
  );
}
