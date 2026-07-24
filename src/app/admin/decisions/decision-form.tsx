"use client";

import { useActionState } from "react";
import { registerDecisionAction, type DecisionActionState } from "./actions";
import { Field, Label, inputCls, btnPrimary } from "@/components/ui";
import { ADMISSION_RESULT_LABELS, DECISION_DOCUMENTS } from "@/lib/constants";
import type { AdmissionResult } from "@/lib/types";

const NOTIFY_OPTIONS: { value: string; label: string }[] = [
  { value: "email", label: "メール" },
  { value: "line", label: "LINE" },
  { value: "postal", label: "郵送" },
];

const RESULT_STYLES: Record<AdmissionResult, string> = {
  accepted: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700",
  rejected: "peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700",
  waitlist: "peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700",
};

export default function DecisionForm({
  candidates,
}: {
  candidates: { leadId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<DecisionActionState, FormData>(
    registerDecisionAction,
    {}
  );

  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
        合否登録が可能な受験者はいません
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="対象者" required>
          <select name="lead_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              受験者を選択してください
            </option>
            {candidates.map((c) => (
              <option key={c.leadId} value={c.leadId}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <Label required>結果</Label>
          <div className="flex gap-2">
            {(Object.keys(ADMISSION_RESULT_LABELS) as AdmissionResult[]).map((r) => (
              <label key={r} className="flex-1">
                <input type="radio" name="result" value={r} required className="peer sr-only" />
                <span
                  className={`block cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50 ${RESULT_STYLES[r]}`}
                >
                  {ADMISSION_RESULT_LABELS[r]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label required>通知方法</Label>
        <div className="flex flex-wrap gap-2">
          {NOTIFY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                name="notified_via"
                value={opt.value}
                defaultChecked
                className="accent-brand-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>同封書類</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DECISION_DOCUMENTS.map((doc) => (
            <label
              key={doc.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50"
            >
              <input type="checkbox" name={`doc_${doc.key}`} className="accent-brand-600" />
              {doc.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 合否を登録し、通知を送信しました
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "合否を登録して通知する"}
      </button>
    </form>
  );
}
