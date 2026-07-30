"use client";

import { useActionState } from "react";
import { btnSmall } from "@/components/ui";
import { markAllPresent, type BulkPresentState } from "./actions";

/** 未登録の生徒だけを「出席」で一括登録するボタン (既に登録済みの生徒は上書きしない) */
export default function BulkPresentButton({ date, unrecorded }: { date: string; unrecorded: number }) {
  const [state, formAction, pending] = useActionState<BulkPresentState, FormData>(markAllPresent, {});
  const disabled = pending || unrecorded === 0;

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        if (!window.confirm(`未登録の ${unrecorded} 名を全員「出席」として登録します。よろしいですか?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="date" value={date} />
      <button type="submit" disabled={disabled} className={btnSmall}>
        未登録を全員出席にする
      </button>
      {pending && <span className="text-xs text-gray-400">登録中…</span>}
      {!pending && state.ok && (
        <span className="text-xs font-semibold text-emerald-600">
          {state.count && state.count > 0 ? `✓ ${state.count}名を出席で登録しました` : "対象がありませんでした"}
        </span>
      )}
      {!pending && state.error && <span className="text-xs font-semibold text-red-600">{state.error}</span>}
    </form>
  );
}
