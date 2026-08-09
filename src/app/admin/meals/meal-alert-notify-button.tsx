"use client";

import { useActionState, useEffect } from "react";
import { showErrorToast } from "@/lib/toast";
import { notifyMealAlert, type MealAlertNotifyState } from "./actions";

/**
 * 欠食アラートの内容を職員へメール通知するボタン。
 * 自動送信 (cron) は設けず、管理者の手動操作でのみ送信する。
 */
export default function MealAlertNotifyButton({ date, count }: { date: string; count: number }) {
  const [state, formAction, pending] = useActionState<MealAlertNotifyState, FormData>(notifyMealAlert, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
  }, [state]);

  if (state.ok) {
    return (
      <p className="mt-3 text-xs font-bold text-emerald-700">✓ {state.sent ?? 0}名の職員へ送信しました</p>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3"
      onSubmit={(e) => {
        if (
          !window.confirm(
            `欠食が続いている生徒 ${count}名 の一覧を職員宛にメール送信します。よろしいですか?`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="date" value={date} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
      >
        {pending ? "送信中…" : "この内容を職員へメール通知する"}
      </button>
    </form>
  );
}
