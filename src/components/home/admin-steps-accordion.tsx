"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AdminStepGroup {
  title: string;
  steps: string[];
}

function stepTone(globalIndex: number): string {
  if (globalIndex < 5) return "bg-brand-600 text-white";
  if (globalIndex < 9) return "bg-brand-100 text-brand-700";
  return "border border-gray-200 bg-gray-50 text-gray-500";
}

export default function AdminStepsAccordion({ groups }: { groups: AdminStepGroup[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  let runningIndex = 0;
  const groupsWithOffset = groups.map((g) => {
    const offset = runningIndex;
    runningIndex += g.steps.length;
    return { ...g, offset };
  });

  return (
    <div className="space-y-3">
      {groupsWithOffset.map((group, i) => {
        const open = openIndex === i;
        return (
          <div
            key={group.title}
            className="overflow-hidden border border-gray-200 transition-colors"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3.5 text-left transition hover:bg-gray-50"
              aria-expanded={open}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-bold text-gray-800">{group.title}</span>
                <span className="hidden text-xs text-gray-400 sm:inline">
                  ({group.steps.length}ステップ)
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-4">
                  {group.steps.map((step, j) => (
                    <span
                      key={step}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${stepTone(
                        group.offset + j
                      )}`}
                    >
                      <span className="text-[10px] opacity-70">
                        {String(group.offset + j + 1).padStart(2, "0")}
                      </span>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
