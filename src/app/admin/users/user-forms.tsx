"use client";

import { useActionState, useEffect } from "react";
import { Field, inputCls, btnPrimary, btnDanger } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { createAdminAction, deleteUserAction, type ActionState } from "./actions";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>;
  if (state.ok) {
    return (
      <div className="space-y-2">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message ?? "保存しました"}</p>
        {state.password && (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            仮パスワード: <span className="font-mono text-base font-bold">{state.password}</span>
            <p className="mt-1 text-xs text-amber-600">本人へメール通知済みです。この画面を閉じると再表示できません。</p>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function CreateAdminForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAdminAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="メールアドレス" required>
          <input name="email" type="email" required className={inputCls} placeholder="staff@bajigakuin.jp" />
        </Field>
        <Field label="氏名" required>
          <input name="full_name" required className={inputCls} placeholder="山田 太郎" />
        </Field>
        <Field label="電話番号">
          <input name="phone" className={inputCls} placeholder="090-0000-0000" />
        </Field>
        <Field label="LINE ID">
          <input name="line_id" className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "追加中…" : "管理者を追加"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteUserForm({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteUserAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast(state.message ?? "ユーザーを削除しました");
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`「${userName}」のアカウントを削除します。この操作は取り消せません。よろしいですか?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <button type="submit" disabled={pending} className={btnDanger}>
        {pending ? "削除中…" : "削除"}
      </button>
    </form>
  );
}
