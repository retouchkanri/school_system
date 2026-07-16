"use client";

import { useActionState } from "react";
import { updateAccountAction, type AccountState } from "./actions";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import type { Profile } from "@/lib/types";

export default function AccountForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(updateAccountAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label>メールアドレス(変更不可)</Label>
        <input value={profile.email ?? ""} readOnly disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
      </div>
      <div>
        <Label required>氏名</Label>
        <input name="full_name" defaultValue={profile.full_name} required className={inputCls} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>電話番号</Label>
          <input name="phone" defaultValue={profile.phone ?? ""} className={inputCls} placeholder="090-0000-0000" />
        </div>
        <div>
          <Label>LINE ID</Label>
          <input name="line_id" defaultValue={profile.line_id ?? ""} className={inputCls} />
        </div>
      </div>
      <div>
        <Label>新しいパスワード(変更する場合のみ・8文字以上)</Label>
        <input name="new_password" type="password" minLength={8} className={inputCls} placeholder="変更しない場合は空欄" />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 保存しました</p>}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
