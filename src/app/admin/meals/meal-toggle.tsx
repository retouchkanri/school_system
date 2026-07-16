"use client";

import { useActionState } from "react";
import type { MealType } from "@/lib/types";
import { toggleMeal, type ActionState } from "./actions";

export default function MealToggle({
  studentId,
  date,
  meal,
  eaten,
}: {
  studentId: string;
  date: string;
  meal: MealType;
  eaten: boolean | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(toggleMeal, {});

  // 未登録 → ○(食べた) → ×(食べない) → ○ … とクリックで切替
  const next = eaten === true ? "false" : "true";
  const cls =
    eaten === true
      ? "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      : eaten === false
        ? "border-red-200 bg-red-100 text-red-700 hover:bg-red-200"
        : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100";

  return (
    <form action={formAction} className="inline-flex flex-col items-center">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="eaten" value={next} />
      <button
        type="submit"
        disabled={pending}
        title={eaten === true ? "食べた → クリックで「食べない」に変更" : eaten === false ? "食べない → クリックで「食べた」に変更" : "未登録 → クリックで「食べた」を記録"}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-base font-bold transition disabled:opacity-50 ${cls}`}
      >
        {pending ? "…" : eaten === true ? "○" : eaten === false ? "×" : "—"}
      </button>
      {state.error && <span className="mt-0.5 text-[10px] text-red-600">失敗</span>}
    </form>
  );
}
