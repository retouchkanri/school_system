"use client";

import { useActionState } from "react";
import { generateSummaryAction, shareSummaryAction, type ActionState } from "./actions";
import { btnSmall } from "@/components/ui";

/** 今月/先月のAI要約生成ボタン (1フォーム2ボタン) */
export function GenerateSummaryForm({ horseId }: { horseId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(generateSummaryAction, {});
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="horse_id" value={horseId} />
        <button type="submit" name="target" value="current" disabled={pending} className={btnSmall}>
          {pending ? "生成中…" : "🤖 今月の要約を生成"}
        </button>
        <button type="submit" name="target" value="previous" disabled={pending} className={btnSmall}>
          {pending ? "生成中…" : "🤖 先月の要約を生成"}
        </button>
      </form>
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {state.ok && state.message && <span className="text-xs font-medium text-emerald-700">{state.message}</span>}
    </div>
  );
}

/** 支援者と共有トグル (shared=true + 支援者へ通知送信) */
export function ShareForm({ summaryId, shared }: { summaryId: string; shared: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(shareSummaryAction, {});
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="summary_id" value={summaryId} />
      {!shared && (
        <button type="submit" disabled={pending} className={btnSmall}>
          {pending ? "送信中…" : "💌 支援者と共有"}
        </button>
      )}
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {state.ok && state.message && <span className="text-xs font-medium text-emerald-700">{state.message}</span>}
    </form>
  );
}
