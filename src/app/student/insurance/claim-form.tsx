"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { submitInsuranceClaim, type InsuranceActionState } from "./actions";

export interface InjuryOption {
  id: string;
  label: string;
}

export default function ClaimForm({ injuries }: { injuries: InjuryOption[] }) {
  const [state, formAction, pending] = useActionState<InsuranceActionState, FormData>(
    submitInsuranceClaim,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 保険申請を送信しました。学校で確認のうえご連絡します。
        </p>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <Field label="対象の怪我">
        <select name="injury_record_id" defaultValue="" className={inputCls}>
          <option value="">該当なし(直接入力)</option>
          {injuries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="保険会社">
          <input name="insurance_company" className={inputCls} placeholder="例: ○○損害保険" />
        </Field>
        <Field label="請求予定額 (円)">
          <input type="number" name="claim_amount" min={0} step={1} className={inputCls} placeholder="例: 15000" />
        </Field>
      </div>

      <Field label="事故の概要" required>
        <textarea
          name="incident_summary"
          rows={4}
          required
          className={inputCls}
          placeholder="いつ・どこで・どのような状況で怪我をしたか、その後の通院状況などをご記入ください。"
        />
      </Field>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "保険申請を送信する"}
      </button>
    </form>
  );
}
