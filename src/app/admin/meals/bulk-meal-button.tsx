"use client";

import { useActionState, useEffect } from "react";
import type { MealType } from "@/lib/types";
import { btnSmall } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { markAllMeals, type BulkMealState } from "./actions";

/**
 * 指定食事について、まだ記録が無い生徒だけを一括で「○(食べた)」にするボタン。
 * 既存の記録は上書きしないため、個別に×を付けた生徒はそのまま残る。
 */
export default function BulkMealButton({
  date,
  meal,
  mealLabel,
  unrecorded,
}: {
  date: string;
  meal: MealType;
  mealLabel: string;
  unrecorded: number;
}) {
  const [state, formAction, pending] = useActionState<BulkMealState, FormData>(markAllMeals, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast(`${mealLabel}を${state.created ?? 0}名分「○」で登録しました`);
  }, [state, mealLabel]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `${date} の${mealLabel}について、未登録の${unrecorded}名を「○(食べた)」で一括登録します。よろしいですか?`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <button
        type="submit"
        disabled={pending || unrecorded === 0}
        title={
          unrecorded === 0
            ? `${mealLabel}は全員登録済みです`
            : `${mealLabel}の未登録${unrecorded}名を一括で「○」にします`
        }
        className={btnSmall}
      >
        {pending ? "登録中…" : `${mealLabel} 全員○`}
        <span className="font-mono text-[10px] opacity-60">({unrecorded})</span>
      </button>
    </form>
  );
}
