"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  POST_VISIT_PAGE2_START_ID,
  POST_VISIT_QUESTIONS,
  POST_VISIT_STAR_LABELS,
  type SurveyQuestion,
} from "@/lib/constants";
import { Label, inputCls, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { submitExperienceAction, type ActionState } from "./actions";

const OTHER_OPTION = "その他";
const PAGE2_START = POST_VISIT_QUESTIONS.findIndex((q) => q.id === POST_VISIT_PAGE2_START_ID);

const TABS = [
  { page: 1 as const, label: "本日の感想について" },
  { page: 2 as const, label: "入学についてお伺いします" },
];

function isOtherField(q: SurveyQuestion): boolean {
  return q.id.endsWith("_other");
}

function parentCheckboxId(otherId: string): string {
  return otherId.replace(/_other$/, "");
}

/** 設問番号（「その他」記入欄は前問の続きのため番号なし） */
const QUESTION_NUMBERS: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let n = 0;
  for (const q of POST_VISIT_QUESTIONS) {
    if (!isOtherField(q)) {
      n += 1;
      map[q.id] = n;
    }
  }
  return map;
})();

function StarInput({ id, labels }: { id: string; labels: Record<number, string> }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const description = active > 0 ? labels[active] : null;

  return (
    <div className="mt-1">
      <div className="flex gap-3" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={`flex cursor-pointer flex-col items-center gap-1 text-2xl transition ${
              n <= active ? "text-amber-400" : "text-gray-300"
            }`}
            onMouseEnter={() => setHover(n)}
            title={labels[n]}
          >
            <input
              type="radio"
              name={id}
              value={n}
              required
              className="sr-only"
              checked={value === n}
              onChange={() => setValue(n)}
            />
            <span>★</span>
            <span className="text-[10px] text-gray-400">{n}</span>
          </label>
        ))}
      </div>
      <p
        className={`mt-1.5 min-h-[1.25rem] text-sm transition ${
          description ? "text-gray-700" : "text-transparent"
        }`}
        aria-live="polite"
      >
        {description ?? "—"}
      </p>
    </div>
  );
}

function QuestionFields({
  questions,
  otherChecked,
  onOtherToggle,
}: {
  questions: SurveyQuestion[];
  otherChecked: Record<string, boolean>;
  onOtherToggle: (questionId: string, checked: boolean) => void;
}) {
  let lastSection = "";
  return (
    <div className="space-y-5">
      {questions.map((q) => {
        if (isOtherField(q) && !otherChecked[parentCheckboxId(q.id)]) {
          return null;
        }

        const showSection = q.section && q.section !== lastSection;
        if (showSection) lastSection = q.section!;
        const number = QUESTION_NUMBERS[q.id];
        const labelText = number != null ? `${number}. ${q.text}` : q.text;

        return (
          <div key={q.id} className={isOtherField(q) ? "-mt-3" : undefined}>
            {showSection && (
              <h3 className="mb-3 mt-6 border-b border-gray-100 pb-1 text-sm font-bold text-gray-700 first:mt-0">
                {q.section}
              </h3>
            )}
            <Label required={q.required}>{labelText}</Label>
            {(q.type === "choice" || q.type === "checkbox") && q.options && (
              // 選択肢は1行に1項目ずつ縦に並べる (仮審査アンケートと表示を統一)
              <div className="mt-1 flex flex-col gap-2">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
                  >
                    <input
                      type={q.type === "choice" ? "radio" : "checkbox"}
                      name={q.id}
                      value={opt}
                      required={q.type === "choice" && q.required}
                      className="accent-brand-600"
                      onChange={
                        q.type === "checkbox" && opt === OTHER_OPTION
                          ? (e) => onOtherToggle(q.id, e.target.checked)
                          : undefined
                      }
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === "stars" && (
              <StarInput id={q.id} labels={POST_VISIT_STAR_LABELS[q.id] ?? {}} />
            )}
            {q.type === "text" && <input name={q.id} className={inputCls} />}
            {q.type === "textarea" && (
              <textarea name={q.id} rows={3} className={inputCls} placeholder="ご自由にご記入ください" />
            )}
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
    if (n >= 1 && n <= 5) {
      const label = POST_VISIT_STAR_LABELS[q.id]?.[n];
      const stars = "★".repeat(n) + "☆".repeat(5 - n);
      return label ? `${stars}　${label}` : stars;
    }
  }
  return value;
}

function ReadOnlyAnswers({ questions, answers }: { questions: SurveyQuestion[]; answers: Record<string, string> }) {
  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const value = answers[q.id]?.trim() ?? "";
        if (isOtherField(q) && !value) return null;
        const number = QUESTION_NUMBERS[q.id];
        const labelText = number != null ? `${number}. ${q.text}` : q.text;
        return (
          <div key={q.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
            <p className="text-xs font-semibold text-gray-500">{labelText}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{formatAnswer(q, value)}</p>
          </div>
        );
      })}
    </div>
  );
}

function findMissingRequired(form: HTMLFormElement): { id: string; page: number; label: string } | null {
  for (const q of POST_VISIT_QUESTIONS) {
    if (!q.required) continue;
    if (q.type === "stars" || q.type === "choice") {
      const checked = form.querySelector<HTMLInputElement>(`input[name="${q.id}"]:checked`);
      if (!checked) {
        const page = POST_VISIT_QUESTIONS.findIndex((x) => x.id === q.id) < PAGE2_START ? 1 : 2;
        return { id: q.id, page, label: q.text };
      }
    } else {
      const value = String(new FormData(form).get(q.id) ?? "").trim();
      if (!value) {
        const page = POST_VISIT_QUESTIONS.findIndex((x) => x.id === q.id) < PAGE2_START ? 1 : 2;
        return { id: q.id, page, label: q.text };
      }
    }
  }
  return null;
}

export default function ExperienceForm({
  answers,
  aiMessage,
}: {
  answers: Record<string, string> | null;
  aiMessage?: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitExperienceAction, {});
  const [page, setPage] = useState(1);
  const [otherChecked, setOtherChecked] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const page1Questions = POST_VISIT_QUESTIONS.slice(0, PAGE2_START);
  const page2Questions = POST_VISIT_QUESTIONS.slice(PAGE2_START);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("ご回答ありがとうございました");
  }, [state]);

  if (answers) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ご回答ありがとうございました。回答内容は以下のとおりです。
        </p>
        {aiMessage && (
          <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <p className="text-xs font-bold text-purple-600">AIからのメッセージ</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{aiMessage}</p>
          </div>
        )}
        <ReadOnlyAnswers questions={POST_VISIT_QUESTIONS} answers={answers} />
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold text-emerald-800">ご回答ありがとうございました</p>
        {state.message && (
          <div className="mx-auto mt-4 max-w-lg rounded-xl border border-purple-200 bg-purple-50/50 p-4 text-left">
            <p className="text-xs font-bold text-purple-600">AIからのメッセージ</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{state.message}</p>
          </div>
        )}
      </div>
    );
  }

  function onOtherToggle(questionId: string, checked: boolean) {
    setOtherChecked((prev) => ({ ...prev, [questionId]: checked }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = formRef.current;
    if (!form) return;
    const missing = findMissingRequired(form);
    if (missing) {
      e.preventDefault();
      setPage(missing.page);
      showErrorToast(`「${missing.label}」を入力してください`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex border-b border-gray-200" role="tablist" aria-label="アンケートページ">
        {TABS.map((tab) => {
          const active = page === tab.page;
          return (
            <button
              key={tab.page}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPage(tab.page)}
              className={`-mb-px flex-1 border-b-2 px-3 py-2.5 text-center text-sm font-medium transition ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={page === 1 ? undefined : "hidden"} role="tabpanel" aria-hidden={page !== 1}>
        <QuestionFields
          questions={page1Questions}
          otherChecked={otherChecked}
          onOtherToggle={onOtherToggle}
        />
      </div>

      <div className={page === 2 ? undefined : "hidden"} role="tabpanel" aria-hidden={page !== 2}>
        <QuestionFields
          questions={page2Questions}
          otherChecked={otherChecked}
          onOtherToggle={onOtherToggle}
        />
      </div>

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "アンケートを送信する"}
      </button>
    </form>
  );
}
