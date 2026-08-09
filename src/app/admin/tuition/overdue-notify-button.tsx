"use client";

import { useActionState, useEffect } from "react";
import { showErrorToast } from "@/lib/toast";
import { notifyOverdueTuitionAction, type ReminderState } from "./actions";

/** 期限超過の学費について、保護者へまとめて案内メール+LINEを送るボタン */
export default function OverdueNotifyButton({ count }: { count: number }) {
  const [state, formAction, pending] = useActionState<ReminderState, FormData>(notifyOverdueTuitionAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
  }, [state]);

  if (state.ok) {
    return <p className="text-xs font-bold text-emerald-700">✓ {state.sent ?? 0}名の保護者へ送信しました</p>;
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `納付期限を過ぎている学費 ${count}件 について、対象のご家庭へ案内メール・LINEを送信します。よろしいですか?`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending || count === 0}
        className="inline-flex items-center gap-1 border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "送信中…" : "期限超過のご家庭へ案内を送る"}
      </button>
    </form>
  );
}
