"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { PRE_SCREENING_QUESTIONS, type SurveyQuestion } from "@/lib/constants";
import { Label, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { submitSurveyAction, type ActionState } from "./actions";

function isFollowUp(q: SurveyQuestion): boolean {
  return !!q.dependsOn;
}

/** 親設問ごとにぶら下がる条件付き設問 */
const FOLLOW_UPS_BY_PARENT = PRE_SCREENING_QUESTIONS.reduce(
  (acc, q) => {
    if (!q.dependsOn) return acc;
    const parentId = q.dependsOn.questionId;
    (acc[parentId] ??= []).push(q);
    return acc;
  },
  {} as Record<string, SurveyQuestion[]>
);

/** 1ページ = 1つの主設問 (条件付きフォローアップは親に紐づく) */
const PAGES = (() => {
  const pages: { title: string; section?: string; question: SurveyQuestion }[] = [];
  let lastSection = "";
  for (const q of PRE_SCREENING_QUESTIONS) {
    if (isFollowUp(q)) continue;
    if (q.section) lastSection = q.section;
    pages.push({
      title: q.text.length > 22 ? `${q.text.slice(0, 22)}…` : q.text,
      section: lastSection || undefined,
      question: q,
    });
  }
  return pages;
})();

function matchesDependsOn(
  selected: string[],
  dependsOn: { questionId: string; values: string[] }
): boolean {
  return dependsOn.values.some((v) => selected.includes(v));
}

function QuestionCard({
  q,
  followUps,
  selectedValues,
  onSelectionChange,
}: {
  q: SurveyQuestion;
  followUps: SurveyQuestion[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
      <Label required={q.required}>{q.text}</Label>
      {q.note && <p className="mb-2 text-xs text-gray-400">{q.note}</p>}

      {(q.type === "choice" || q.type === "checkbox") && q.options && (
        <div className="mt-2 flex flex-col gap-2">
          {q.options.map((opt) => (
            <label
              key={opt}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
            >
              <input
                type={q.type === "choice" ? "radio" : "checkbox"}
                name={q.id}
                value={opt}
                className="accent-brand-600"
                checked={selectedValues.includes(opt)}
                onChange={(e) => {
                  if (q.type === "choice") {
                    onSelectionChange([opt]);
                  } else {
                    onSelectionChange(
                      e.target.checked
                        ? [...selectedValues, opt]
                        : selectedValues.filter((v) => v !== opt)
                    );
                  }
                }}
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
          maxLength={q.id.includes("worry") ? 300 : undefined}
          className={inputCls}
          placeholder="ご自由にご記入ください"
        />
      )}

      {followUps.map((fu) => {
        if (!fu.dependsOn || !matchesDependsOn(selectedValues, fu.dependsOn)) return null;
        return (
          <div key={fu.id} className="mt-3 border-t border-gray-100 pt-3">
            <Label>{fu.text}</Label>
            {fu.type === "textarea" ? (
              <textarea
                name={fu.id}
                rows={3}
                maxLength={fu.id.includes("worry") ? 300 : undefined}
                className={inputCls}
                placeholder="ご自由にご記入ください"
              />
            ) : (
              <input name={fu.id} className={inputCls} placeholder="ご自由にご記入ください" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressPanel({
  pageIndex,
  totalPages,
  pageTitles,
}: {
  pageIndex: number;
  totalPages: number;
  pageTitles: string[];
}) {
  const percent = Math.round(((pageIndex + 1) / totalPages) * 100);

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="sticky top-24 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500">回答の進捗</p>
        <p className="mt-1 text-2xl font-bold text-brand-700">{percent}%</p>
        <p className="text-xs text-gray-400">
          {pageIndex + 1} / {totalPages} ページ
        </p>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ol className="mt-4 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {pageTitles.map((title, i) => {
            const done = i < pageIndex;
            const current = i === pageIndex;
            return (
              <li
                key={`${i}-${title}`}
                className={`flex items-start gap-2 text-[11px] leading-snug ${
                  current ? "font-bold text-brand-700" : done ? "text-brand-600" : "text-gray-400"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    done
                      ? "bg-brand-500 text-white"
                      : current
                        ? "bg-brand-100 text-brand-700 ring-1 ring-brand-500"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span>{title}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

function validatePage(
  form: HTMLFormElement,
  pageIdx: number,
  selections: Record<string, string[]>
): string | null {
  const page = PAGES[pageIdx];
  const q = page.question;
  if (!q.required) return null;

  if (q.type === "choice") {
    const checked = form.querySelector<HTMLInputElement>(`input[name="${q.id}"]:checked`);
    if (!checked) return `「${q.text}」は必須です`;
  }
  if (q.type === "textarea" || q.type === "text") {
    const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${q.id}"]`);
    if (el && !el.value.trim()) return `「${q.text}」は必須です`;
  }

  // 表示中のフォローアップは任意 (入力必須にしない)
  void selections;
  return null;
}

export default function SurveyForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitSurveyAction, {});
  const [pageIndex, setPageIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const pageTitles = useMemo(() => PAGES.map((p) => p.title), []);
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === PAGES.length - 1;

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("ご回答ありがとうございました。仮審査結果をご確認ください。");
  }, [state]);

  const goNext = () => {
    const form = formRef.current;
    if (!form) return;
    const err = validatePage(form, pageIndex, selections);
    if (err) {
      showErrorToast(err);
      return;
    }
    setPageIndex((i) => Math.min(PAGES.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setPageIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = formRef.current;
    if (!form) return;
    for (let i = 0; i < PAGES.length; i++) {
      const err = validatePage(form, i, selections);
      if (err) {
        e.preventDefault();
        setPageIndex(i);
        showErrorToast(err);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
  };

  if (state.ok) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="min-w-0 flex-1 space-y-5"
        noValidate
      >
        {PAGES.map((page, i) => {
          const q = page.question;
          const followUps = FOLLOW_UPS_BY_PARENT[q.id] ?? [];
          const selected = selections[q.id] ?? [];
          return (
            <div
              key={q.id}
              className={i === pageIndex ? "space-y-4" : "hidden"}
              aria-hidden={i !== pageIndex}
            >
              {page.section && (
                <h2 className="text-base font-bold text-gray-900">{page.section}</h2>
              )}
              <QuestionCard
                q={q}
                followUps={followUps}
                selectedValues={selected}
                onSelectionChange={(values) =>
                  setSelections((prev) => ({ ...prev, [q.id]: values }))
                }
              />
            </div>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={isFirst}
            className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            ← 前へ
          </button>

          <span className="text-xs text-gray-400">
            {pageIndex + 1} / {PAGES.length}
          </span>

          {isLast ? (
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "送信中…" : "回答を送信する"}
            </button>
          ) : (
            <button type="button" onClick={goNext} className={btnPrimary}>
              次へ →
            </button>
          )}
        </div>
      </form>

      <ProgressPanel pageIndex={pageIndex} totalPages={PAGES.length} pageTitles={pageTitles} />
    </div>
  );
}
