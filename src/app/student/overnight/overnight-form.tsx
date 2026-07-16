"use client";

import { useActionState } from "react";
import { submitOvernightRequest, type OvernightActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";

export default function OvernightForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState<OvernightActionState, FormData>(submitOvernightRequest, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 外泊届を提出しました。保護者へ承認依頼を送信しています。
        </p>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="開始日" required>
          <input type="date" name="start_date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="終了日" required>
          <input type="date" name="end_date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
      </div>

      <Field label="行き先" required>
        <input name="destination" required className={inputCls} placeholder="例: 実家(千葉県八街市)" />
      </Field>

      <Field label="理由">
        <textarea name="reason" rows={3} className={inputCls} placeholder="例: 祖父母の法事のため帰省します。" />
      </Field>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "外泊届を提出する"}
      </button>
    </form>
  );
}
