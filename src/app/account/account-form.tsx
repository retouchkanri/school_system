"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updateAccountAction, type AccountState } from "./actions";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import AvatarPicker from "@/components/avatar-picker";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { Profile } from "@/lib/types";

function PasswordField({
  name,
  label,
  autoComplete,
  minLength,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          minLength={minLength}
          className={`${inputCls} pr-10`}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "パスワードを隠す" : "パスワードを表示する"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function AccountForm({
  profile,
  birthDate,
}: {
  profile: Profile;
  birthDate?: string | null;
}) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(updateAccountAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("保存しました");
  }, [state]);

  return (
    <form action={formAction} className="space-y-5" autoComplete="off">
      <AvatarPicker name="avatar" initialUrl={profile.avatar_url} fallbackInitial={profile.full_name} />
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
          <Label>生年月日</Label>
          <input
            name="birth_date"
            type="text"
            inputMode="numeric"
            defaultValue={birthDate ? birthDate.replace(/-/g, "") : ""}
            className={inputCls}
            placeholder="例: 20040212"
            pattern="\d{8}"
            maxLength={8}
            autoComplete="bday"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-600">パスワードの変更</p>
        <PasswordField name="old_password" label="現在のパスワード" autoComplete="current-password" />
        <PasswordField name="new_password" label="新しいパスワード" autoComplete="new-password" minLength={8} />
        <PasswordField
          name="confirm_password"
          label="新しいパスワード(確認)"
          autoComplete="new-password"
          minLength={8}
        />
        <p className="text-[11px] text-gray-400">パスワードを変更しない場合はすべて空欄のままにしてください</p>
      </div>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
