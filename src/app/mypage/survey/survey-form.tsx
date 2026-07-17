"use client";

import { useActionState } from "react";
import { PRE_SCREENING_QUESTIONS, type SurveyQuestion } from "@/lib/constants";
import { Label, inputCls, btnPrimary } from "@/components/ui";
import { submitSurveyAction, type ActionState } from "./actions";

function QuestionFields({ questions }: { questions: SurveyQuestion[] }) {
  let lastSection = "";
  return (
    <>
      {questions.map((q) => {
        const showSection = q.section && q.section !== lastSection;
        if (showSection) lastSection = q.section!;
        return (
          <div key={q.id}>
            {showSection && (
              <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-wide text-brand-600 first:mt-0">
                {q.section}
              </h2>
            )}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <Label required={q.required}>{q.text}</Label>
              {q.note && <p className="mb-2 text-xs text-gray-400">{q.note}</p>}
              {(q.type === "choice" || q.type === "checkbox") && q.options && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
                    >
                      <input
                        type={q.type === "choice" ? "radio" : "checkbox"}
                        name={q.id}
                        value={opt}
                        required={q.type === "choice" && q.required}
                        className="accent-brand-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "text" && (
                <input name={q.id} className={inputCls} placeholder="ご自由にご記入ください" />
              )}
              {q.type === "textarea" && (
                <textarea
                  name={q.id}
                  rows={3}
                  required={q.required}
                  className={inputCls}
                  placeholder="ご自由にご記入ください"
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function SurveyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitSurveyAction, {});

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold text-emerald-800">ご回答ありがとうございました</p>
        <p className="mt-1 text-sm text-emerald-700">入学仮審査結果を表示しています。ページの内容をご確認ください。</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <QuestionFields questions={PRE_SCREENING_QUESTIONS} />

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "送信中…" : "回答を送信する"}
      </button>
    </form>
  );
}
