"use client";

import { useActionState } from "react";
import { decideOvernightRequest, type OvernightDecisionState } from "./actions";
import { inputCls, btnPrimary, btnDanger } from "@/components/ui";

export default function ApprovalForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState<OvernightDecisionState, FormData>(
    decideOvernightRequest,
    {}
  );

  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 回答を送信しました。</p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <input type="hidden" name="id" value={requestId} />
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">コメント(任意)</label>
        <input name="comment" className={inputCls} placeholder="例: 帰宅時は駅まで迎えに行きます。" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="decision" value="approved" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "承認する"}
        </button>
        <button type="submit" name="decision" value="rejected" disabled={pending} className={btnDanger}>
          {pending ? "送信中…" : "却下する"}
        </button>
      </div>
    </form>
  );
}
