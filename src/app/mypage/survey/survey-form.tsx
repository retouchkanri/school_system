"use client";

import { useActionState } from "react";
import { PRE_SCREENING_QUESTIONS } from "@/lib/constants";
import { Label, inputCls, btnPrimary } from "@/components/ui";
import { submitSurveyAction, type ActionState } from "./actions";

export default function SurveyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitSurveyAction, {});

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-2 text-sm font-bold text-emerald-800">ご回答ありがとうございました</p>
        <p className="mt-1 text-sm text-emerald-700">AI判定の結果を表示しています。ページの内容をご確認ください。</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {PRE_SCREENING_QUESTIONS.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Label required={q.type === "choice" || q.id === "q1" || q.id === "q2"}>
            Q{i + 1}. {q.text}
          </Label>
          {q.type === "choice" && q.options && (
            <div className="mt-2 flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
                >
                  <input type="radio" name={q.id} value={opt} required className="accent-brand-600" />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === "text" && (
            <input name={q.id} className={inputCls} placeholder="ご自由にご記入ください(なければ「なし」)" />
          )}
          {q.type === "textarea" && (
            <textarea
              name={q.id}
              rows={3}
              required={q.id === "q1" || q.id === "q2"}
              className={inputCls}
              placeholder="ご自由にご記入ください"
            />
          )}
        </div>
      ))}

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "送信中…(AI判定を行っています)" : "回答を送信する"}
      </button>
    </form>
  );
}
