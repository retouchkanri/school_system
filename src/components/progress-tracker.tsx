"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PROGRESS_STEPS, statusIndex, completedStepCount } from "@/lib/constants";
import type { LeadStatus } from "@/lib/types";

function StepModal({
  step,
  stateLabel,
  onClose,
}: {
  step: (typeof PROGRESS_STEPS)[number];
  stateLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-step-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-bold text-brand-600">{stateLabel}</p>
        <h2 id="progress-step-title" className="mt-1 pr-8 text-lg font-bold text-gray-900">
          {step.label}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.description}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProgressTracker({ status, compact = false }: { status: LeadStatus; compact?: boolean }) {
  const current = statusIndex(status);
  const [openKey, setOpenKey] = useState<LeadStatus | null>(null);
  const openStep = openKey ? PROGRESS_STEPS.find((s) => s.key === openKey) : null;
  const openIndex = openKey ? statusIndex(openKey) : -1;

  const stateLabel =
    openIndex < 0
      ? ""
      : openIndex < current || status === "enrolled"
        ? "完了済み"
        : openIndex === current
          ? "現在のステップ"
          : "これから進むステップ";

  if (compact) {
    return (
      <div
        className="flex items-center gap-1"
        title={`${completedStepCount(status)} / ${PROGRESS_STEPS.length} 完了`}
      >
        {PROGRESS_STEPS.map((s, i) => (
          <span
            key={s.key}
            title={s.label}
            className={`h-2 w-2 rounded-full ${i <= current ? "bg-brand-500" : "bg-gray-200"}`}
          />
        ))}
        <span className="ml-2 text-xs text-gray-500">
          {completedStepCount(status)} / {PROGRESS_STEPS.length} 完了
        </span>
      </div>
    );
  }

  return (
    <>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PROGRESS_STEPS.map((s, i) => {
          const done = status === "enrolled" || i < current;
          const active = i === current && status !== "enrolled";
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setOpenKey(s.key)}
                className={`w-full rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  done
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : active
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                }`}
              >
                {done ? "✓ " : ""}
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      {openStep && (
        <StepModal step={openStep} stateLabel={stateLabel} onClose={() => setOpenKey(null)} />
      )}
    </>
  );
}
