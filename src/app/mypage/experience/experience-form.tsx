"use client";

import { useActionState } from "react";
import { POST_VISIT_QUESTIONS, type SurveyQuestion } from "@/lib/constants";
import { Label, inputCls, btnPrimary } from "@/components/ui";
import { submitExperienceAction, type ActionState } from "./actions";

function StarInput({ id }: { id: string }) {
  return (
    <div className="mt-1 flex gap-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="flex cursor-pointer flex-col items-center gap-1 text-2xl text-gray-300 has-[:checked]:text-amber-400">
          <input type="radio" name={id} value={n} required className="sr-only" />
          <span>★</span>
          <span className="text-[10px] text-gray-400">{n}</span>
        </label>
      ))}
    </div>
  );
}

function QuestionFields({ questions }: { questions: SurveyQuestion[] }) {
  let lastSection = "";
  return (
    <div className="space-y-5">
      {questions.map((q, i) => {
        const showSection = q.section && q.section !== lastSection;
        if (showSection) lastSection = q.section!;
        return (
          <div key={q.id}>
            {showSection && (
              <h3 className="mb-3 mt-6 border-b border-gray-100 pb-1 text-sm font-bold text-gray-700 first:mt-0">
                {q.section}
              </h3>
            )}
            <Label required={q.required}>
              {i + 1}. {q.text}
            </Label>
            {(q.type === "choice" || q.type === "checkbox") && q.options && (
              <div className="mt-1 flex flex-wrap gap-2">
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
            {q.type === "stars" && <StarInput id={q.id} />}
            {q.type === "text" && <input name={q.id} className={inputCls} />}
            {q.type === "textarea" && <textarea name={q.id} rows={3} className={inputCls} placeholder="ご自由にご記入ください" />}
          </div>
        );
      })}
    </div>
  );
}

function formatAnswer(q: SurveyQuestion, value: string): string {
  if (!value) return "—";
  if (q.type === "stars") {
    const n = Number(value);
    return n >= 1 && n <= 5 ? "★".repeat(n) + "☆".repeat(5 - n) : value;
  }
  return value;
}

function ReadOnlyAnswers({ questions, answers }: { questions: SurveyQuestion[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
          <p className="text-xs font-semibold text-gray-500">
            {i + 1}. {q.text}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{formatAnswer(q, answers[q.id]?.trim() ?? "")}</p>
        </div>
      ))}
    </div>
  );
}

export default function ExperienceForm({ answers }: { answers: Record<string, string> | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitExperienceAction, {});

  if (answers) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ご回答ありがとうございました。回答内容は以下のとおりです。
        </p>
        <ReadOnlyAnswers questions={POST_VISIT_QUESTIONS} answers={answers} />
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold text-emerald-800">ご回答ありがとうございました</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <QuestionFields questions={POST_VISIT_QUESTIONS} />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "アンケートを送信する"}
      </button>
    </form>
  );
}
