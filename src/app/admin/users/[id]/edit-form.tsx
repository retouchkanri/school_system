"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { updateUserAction, resetPasswordAction, type ActionState } from "../actions";
import type { Profile, UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者・職員",
  applicant: "入学希望者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
};

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>;
  if (state.ok) return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message ?? "保存しました"}</p>;
  return null;
}

export function EditUserForm({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateUserAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <Field label="氏名" required>
        <input name="full_name" required defaultValue={user.full_name} className={inputCls} />
      </Field>
      <Field label="電話番号">
        <input name="phone" defaultValue={user.phone ?? ""} className={inputCls} />
      </Field>
      <Field label="LINE ID">
        <input name="line_id" defaultValue={user.line_id ?? ""} className={inputCls} />
      </Field>
      <Field label="ロール">
        <select name="role" defaultValue={user.role} disabled={isSelf} className={inputCls}>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {isSelf && <p className="mt-1 text-xs text-gray-400">自分自身の権限は変更できません</p>}
      </Field>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "保存中…" : "保存"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resetPasswordAction, {});

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">新しい仮パスワードを発行し、本人へメール/LINEで通知します。</p>
      <form action={formAction}>
        <input type="hidden" name="id" value={userId} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "発行中…" : "パスワードを再発行"}
        </button>
      </form>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && state.password && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          仮パスワード: <span className="font-mono text-base font-bold">{state.password}</span>
          <p className="mt-1 text-xs text-amber-600">本人へ通知済みです。この画面を閉じると再表示できません。</p>
        </div>
      )}
    </div>
  );
}
