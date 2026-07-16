"use client";

import { useActionState } from "react";
import { sendAnnouncementAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { AudienceType } from "@/lib/types";

export default function AnnouncementForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sendAnnouncementAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <Field label="配信対象" required>
        <select name="audience" required className={inputCls} defaultValue="all">
          {(Object.keys(AUDIENCE_LABELS) as AudienceType[]).map((k) => (
            <option key={k} value={k}>
              {AUDIENCE_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="タイトル" required>
        <input name="title" required className={inputCls} placeholder="例: 体育祭のご案内" />
      </Field>
      <Field label="本文" required>
        <textarea name="body" required rows={6} className={inputCls} placeholder="お知らせの本文を入力してください" />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="send_email" defaultChecked className="accent-brand-600" />
          📧 メールで送信
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="send_line" defaultChecked className="accent-brand-600" />
          💬 LINEで送信
        </label>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ {state.count ?? 0}件に配信しました
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "📣 配信する"}
      </button>
    </form>
  );
}
