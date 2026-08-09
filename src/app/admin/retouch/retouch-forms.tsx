"use client";

import { useActionState, useState } from "react";
import { generateSummaryAction, shareSummaryAction, updateSummaryAction, type ActionState } from "./actions";
import { btnSmall, inputCls } from "@/components/ui";

/** 今月/先月のAI要約生成ボタン (1フォーム2ボタン) */
export function GenerateSummaryForm({ horseId }: { horseId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(generateSummaryAction, {});
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="horse_id" value={horseId} />
        <button type="submit" name="target" value="current" disabled={pending} className={btnSmall}>
          {pending ? "生成中…" : "今月の要約を生成"}
        </button>
        <button type="submit" name="target" value="previous" disabled={pending} className={btnSmall}>
          {pending ? "生成中…" : "先月の要約を生成"}
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
          {pending ? "送信中…" : "支援者と共有"}
        </button>
      )}
      {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {state.ok && state.message && <span className="text-xs font-medium text-emerald-700">{state.message}</span>}
    </form>
  );
}

/**
 * 生成されたレポート本文を職員が手直しして保存するフォーム。
 * 支援者は学院外部の方なので、AIの文面をそのまま出さず職員が最終確認・修正できるようにする。
 * 共有済みの場合は「支援者へ再通知する」を選べる (既定はオフ = 静かに差し替え)。
 */
export function EditSummaryForm({
  summaryId,
  summary,
  shared,
}: {
  summaryId: string;
  summary: string;
  shared: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateSummaryAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className={btnSmall}>
         本文を編集
        </button>
        {state.ok && state.message && <span className="text-xs font-medium text-emerald-700">{state.message}</span>}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="summary_id" value={summaryId} />
      <textarea
        name="summary"
        defaultValue={summary}
        rows={8}
        className={inputCls}
        placeholder="支援者へお届けするレポート本文"
      />
      {shared && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" name="renotify" className="h-3.5 w-3.5" />
          支援者へ修正後の内容を再通知する(チェックしない場合は公開内容の差し替えのみ)
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={btnSmall}>
          {pending ? "保存中…" : "保存"}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={btnSmall}>
          閉じる
        </button>
        {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
        {state.ok && state.message && <span className="text-xs font-medium text-emerald-700">{state.message}</span>}
      </div>
      {shared && (
        <p className="text-[11px] text-gray-400">
          ※ 共有済みのレポートを編集しても公開状態は維持されます(支援者ポータルの表示が即座に更新されます)。
        </p>
      )}
    </form>
  );
}
