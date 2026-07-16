"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { DEFAULT_STUDENT_SURVEY_QUESTIONS } from "@/lib/constants";
import { createSurvey, type ActionState } from "./actions";

const QUESTIONS = DEFAULT_STUDENT_SURVEY_QUESTIONS as {
  id: string;
  text: string;
  type: string;
  options?: string[];
}[];

export default function SurveyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createSurvey, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Field label="タイトル" required className="lg:col-span-2">
          <input name="title" required placeholder="例: 2026年7月 定期生活アンケート" className={inputCls} />
        </Field>
        <Field label="対象" required>
          <select name="target" required defaultValue="students" className={inputCls}>
            <option value="students">在校生</option>
            <option value="parents">保護者</option>
          </select>
        </Field>
      </div>
      <Field label="説明">
        <textarea
          name="description"
          rows={2}
          placeholder="アンケートの目的や回答期限などを記入してください"
          className={inputCls}
        />
      </Field>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-xs font-bold text-gray-500">設問 (標準設問をそのまま使用します)</p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
          {QUESTIONS.map((q) => (
            <li key={q.id}>
              {q.text}
              {q.options && <span className="ml-1 text-xs text-gray-400">({q.options.join(" / ")})</span>}
              {!q.options && <span className="ml-1 text-xs text-gray-400">(自由記述)</span>}
            </li>
          ))}
        </ol>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ アンケートを作成しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "アンケートを作成する"}
        </button>
      </div>
    </form>
  );
}
