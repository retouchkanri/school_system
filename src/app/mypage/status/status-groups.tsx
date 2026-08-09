"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PROGRESS_GROUPS, PROGRESS_STEPS, statusIndex, completedStepCount } from "@/lib/constants";
import { STEP_ICONS, GROUP_ICONS } from "@/lib/progress-icons";
import type { LeadStatus } from "@/lib/types";

type StepState = "done" | "current" | "todo";

const STATE_LABELS: Record<StepState, string> = {
  done: "完了",
  current: "対応中",
  todo: "未完了",
};

/** 右列(現在の値)のバッジ。完了=ブランド淡色 / 対応中=ブランド塗り / 未完了=グレー */
const STATE_BADGE: Record<StepState, string> = {
  done: "border-brand-200 bg-brand-50 text-brand-700",
  current: "border-brand-600 bg-brand-600 text-white",
  todo: "border-gray-200 bg-white text-gray-400",
};

/**
 * 入学までの18ステップを5つの章に分けて表示するアコーディオン。
 * 各行は「左 = ご案内の内容(初期設定のステップ名・説明) / 右 = 現在の値(状態)」の2列。
 * 章の見出しをクリックすると、その章に含まれるステップの一覧が開く。
 */
export default function StatusGroups({
  status,
  stepHrefs,
}: {
  status: LeadStatus;
  stepHrefs: Partial<Record<LeadStatus, string>>;
}) {
  const total = PROGRESS_STEPS.length;
  const doneCount = completedStepCount(status);
  // lead.status は「完了した最新ステップ」を指すため、いま取り組むステップはその次
  const currentIndex = statusIndex(status) + 1;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const stateOf = (index: number): StepState =>
    index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";

  // 初期状態はすべての章を開いておき、18ステップ全体を一度に見渡せるようにする
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(PROGRESS_GROUPS.map((g) => g.key)));
  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      {/* 全体の進捗 */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-bold text-gray-800">入学までの進捗</p>
          <p className="text-xs text-gray-500">
            <span className="text-base font-bold tabular-nums text-brand-700">{doneCount}</span>
            <span className="tabular-nums"> / {total} 完了</span>
            <span className="ml-2 tabular-nums text-gray-400">({percent}%)</span>
          </p>
        </div>
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden bg-gray-100"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`入学までの進捗 ${doneCount} / ${total} 完了`}
        >
          <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 5つの章 */}
      <div className="mt-4 space-y-2">
        {PROGRESS_GROUPS.map((group, gi) => {
          const open = openKeys.has(group.key);
          const groupDone = group.steps.filter((_, j) => stateOf(group.startIndex + j) === "done").length;
          const hasCurrent = group.steps.some((_, j) => stateOf(group.startIndex + j) === "current");
          const groupState: StepState =
            groupDone === group.steps.length ? "done" : hasCurrent || groupDone > 0 ? "current" : "todo";
          const GroupIcon = GROUP_ICONS[group.key];

          return (
            <div key={group.key} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={open}
                aria-controls={`progress-group-${group.key}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${STATE_BADGE[groupState]}`}
                >
                  <GroupIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-gray-900">
                    {gi + 1}. {group.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">{group.description}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500">
                  {groupDone} / {group.steps.length} 完了
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {open && (
                <div id={`progress-group-${group.key}`} className="border-t border-gray-100">
                  {/* 左右の列見出し */}
                  <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-4 py-1.5">
                    <span className="text-xs font-semibold text-gray-400">ご案内の内容</span>
                    <span className="text-xs font-semibold text-gray-400">現在の値</span>
                  </div>

                  <ul className="divide-y divide-gray-100">
                    {group.steps.map((step, j) => {
                      const index = group.startIndex + j;
                      const state = stateOf(index);
                      const href = stepHrefs[step.key];
                      const StepIcon = STEP_ICONS[step.key];
                      return (
                        <li
                          key={step.key}
                          className={`flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${
                            state === "current" ? "bg-brand-50/50" : state === "done" ? "bg-gray-50/60" : ""
                          }`}
                        >
                          {/* 左: 初期設定の内容 (ステップ名と説明) */}
                          <div className="flex min-w-0 gap-2.5 sm:flex-1">
                            <span
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${STATE_BADGE[state]}`}
                            >
                              <StepIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                <span className="mr-1 text-xs font-bold tabular-nums text-gray-400">{index + 1}</span>
                                {step.label}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.description}</p>
                            </div>
                          </div>

                          {/* 右: 現在の値 (状態と、いま進めるステップへの導線) */}
                          <div className="flex shrink-0 items-center gap-3 pl-[2.35rem] sm:w-36 sm:flex-col sm:items-end sm:gap-1.5 sm:pl-0">
                            <span
                              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STATE_BADGE[state]}`}
                            >
                              {state === "done" && "✓ "}
                              {STATE_LABELS[state]}
                            </span>
                            {state === "current" && href && (
                              <Link
                                href={href}
                                className="text-xs font-semibold text-brand-600 transition hover:underline"
                              >
                                このステップへ進む →
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
