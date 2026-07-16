"use client";

import { useActionState } from "react";
import { sendBulkMessageAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";

const AUDIENCE_OPTIONS = [
  { value: "students", label: "在校生のみ" },
  { value: "parents", label: "保護者のみ" },
  { value: "both", label: "在校生と保護者の両方" },
];

export default function MessageForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sendBulkMessageAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <Field label="送信対象" required>
        <select name="audience" required className={inputCls} defaultValue="both">
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="件名" required>
        <input name="title" required className={inputCls} placeholder="例: 来週の予定について" />
      </Field>
      <Field label="本文" required>
        <textarea name="body" required rows={6} className={inputCls} placeholder="メッセージ本文を入力してください" />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="via_email" defaultChecked className="accent-brand-600" />
          📧 メールで送信
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="via_line" defaultChecked className="accent-brand-600" />
          💬 LINEで送信
        </label>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ {state.count ?? 0}件に送信しました
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "✉️ 一斉送信する"}
      </button>
    </form>
  );
}
