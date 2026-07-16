"use client";

import { useActionState, useState } from "react";
import {
  EXPERIENCE_QUESTIONS_STUDENT,
  EXPERIENCE_QUESTIONS_PARENT,
  type SurveyQuestion,
} from "@/lib/constants";
import { Label, inputCls, btnPrimary, Badge } from "@/components/ui";
import { submitExperienceAction, type ActionState } from "./actions";
import type { RespondentType } from "@/lib/types";

function QuestionFields({ questions }: { questions: SurveyQuestion[] }) {
  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={q.id}>
          <Label required={q.type === "choice"}>
            Q{i + 1}. {q.text}
          </Label>
          {q.type === "choice" && q.options && (
            <div className="mt-1 flex flex-wrap gap-2">
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
          {q.type === "text" && <input name={q.id} className={inputCls} />}
          {q.type === "textarea" && <textarea name={q.id} rows={4} className={inputCls} placeholder="ご自由にご記入ください" />}
        </div>
      ))}
    </div>
  );
}

function ReadOnlyAnswers({ questions, answers }: { questions: SurveyQuestion[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
          <p className="text-xs font-semibold text-gray-500">
            Q{i + 1}. {q.text}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{answers[q.id]?.trim() || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function SurveyTab({
  respondent,
  questions,
  answered,
}: {
  respondent: RespondentType;
  questions: SurveyQuestion[];
  answered: Record<string, string> | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitExperienceAction, {});

  if (answered) {
    return (
      <div>
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ ご回答ありがとうございました。回答内容は以下のとおりです。
        </p>
        <ReadOnlyAnswers questions={questions} answers={answered} />
      </div>
    );
  }

  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        ✓ ご回答ありがとうございました。
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="respondent" value={respondent} />
      <QuestionFields questions={questions} />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : respondent === "student" ? "本人アンケートを送信する" : "保護者アンケートを送信する"}
      </button>
    </form>
  );
}

export default function ExperienceForms({
  studentAnswers,
  parentAnswers,
}: {
  studentAnswers: Record<string, string> | null;
  parentAnswers: Record<string, string> | null;
}) {
  const [tab, setTab] = useState<RespondentType>(studentAnswers && !parentAnswers ? "parent" : "student");

  const tabs: { key: RespondentType; label: string; answered: boolean }[] = [
    { key: "student", label: "ご本人用", answered: !!studentAnswers },
    { key: "parent", label: "保護者用", answered: !!parentAnswers },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition ${
              tab === t.key
                ? "border-b-2 border-brand-600 text-brand-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
            {t.answered && <Badge tone="green">回答済</Badge>}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "student" ? (
          <SurveyTab respondent="student" questions={EXPERIENCE_QUESTIONS_STUDENT} answered={studentAnswers} />
        ) : (
          <SurveyTab respondent="parent" questions={EXPERIENCE_QUESTIONS_PARENT} answered={parentAnswers} />
        )}
      </div>
    </div>
  );
}
