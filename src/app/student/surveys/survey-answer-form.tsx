"use client";

import { useActionState } from "react";
import { submitSurveyAnswer, type SurveyActionState } from "./actions";
import { Label, inputCls, btnPrimary } from "@/components/ui";

export interface SurveyQuestionItem {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

export default function SurveyAnswerForm({
  surveyId,
  questions,
}: {
  surveyId: string;
  questions: SurveyQuestionItem[];
}) {
  const [state, formAction, pending] = useActionState<SurveyActionState, FormData>(submitSurveyAnswer, {});

  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        ✓ 回答を送信しました。ご協力ありがとうございました。
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="survey_id" value={surveyId} />

      {questions.map((q, i) => (
        <div key={q.id}>
          <Label required={q.type === "choice"}>{`Q${i + 1}. ${q.text}`}</Label>
          {q.type === "choice" && q.options && q.options.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name={`q_${q.id}`} value={opt} required className="accent-brand-600" />
                  {opt}
                </label>
              ))}
            </div>
          ) : q.type === "textarea" ? (
            <textarea name={`q_${q.id}`} rows={3} className={inputCls} placeholder="自由にご記入ください" />
          ) : (
            <input name={`q_${q.id}`} className={inputCls} />
          )}
        </div>
      ))}

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "回答を送信する"}
      </button>
    </form>
  );
}
