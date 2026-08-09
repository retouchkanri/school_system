"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { APTITUDE_QUESTIONS, LIKERT_OPTIONS } from "@/lib/aptitude";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { submitAptitudeAction, type ActionState } from "./actions";

const PAGE_SIZE = 10;
const TOTAL = APTITUDE_QUESTIONS.length; // 96
const PAGE_COUNT = Math.ceil(TOTAL / PAGE_SIZE);

export default function AptitudeForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitAptitudeAction, {});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);

  const pageQuestions = useMemo(
    () => APTITUDE_QUESTIONS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page]
  );
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount >= TOTAL;
  const pageAnswered = pageQuestions.every((q) => answers[q.id] !== undefined);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("適性検査の受検が完了しました");
  }, [state]);

  if (state.ok) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <p className="mt-2 text-sm font-bold text-emerald-800">受検が完了しました</p>
        <p className="mt-1 text-sm text-emerald-700">採点とAIレポートの生成が完了しました。ページの結果をご確認ください。</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      {/* 進捗バー */}
      <div className="mb-6 border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
          <span>
            ページ {page + 1} / {PAGE_COUNT}
          </span>
          <span className="text-brand-700">
            回答済み {answeredCount} / {TOTAL} 問
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.round((answeredCount / TOTAL) * 100)}%` }}
          />
        </div>
      </div>

      {/* 設問 (10問ずつ) */}
      <div className="space-y-4">
        {pageQuestions.map((q) => {
          const num = Number(q.id.slice(1));
          return (
            <div key={q.id} className="border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-800">
                <span className="mr-2 text-brand-600">Q{num}</span>
                {q.text}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-5">
                {LIKERT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-xs transition sm:flex-col sm:gap-1 ${
                      answers[q.id] === opt.value
                        ? "border-brand-500 bg-brand-50 font-bold text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={answers[q.id] === opt.value}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                      className="accent-brand-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ナビゲーション */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          className={btnSecondary}
          disabled={page === 0}
          onClick={() => {
            setPage((p) => Math.max(0, p - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          ← 前の10問
        </button>

        {page < PAGE_COUNT - 1 ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={!pageAnswered}
            onClick={() => {
              setPage((p) => Math.min(PAGE_COUNT - 1, p + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            次の10問 →
          </button>
        ) : (
          <button type="submit" className={btnPrimary} disabled={!allAnswered || pending}>
            {pending ? "採点中…" : "回答を送信して結果を見る"}
          </button>
        )}
      </div>
      {!pageAnswered && (
        <p className="mt-2 text-right text-xs text-gray-400">このページの全問に回答すると次へ進めます</p>
      )}
    </form>
  );
}
