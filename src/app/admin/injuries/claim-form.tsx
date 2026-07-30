"use client";

import { useActionState } from "react";
import { inputCls, btnSmall } from "@/components/ui";
import type { InsuranceClaimStatus } from "@/lib/types";
import { updateClaimStatus, type ActionState } from "./actions";
import { CLAIM_ACTION_LABELS, NEXT_CLAIM_STATUSES } from "./options";

/** 保険申請の状態を、職員コメントを添えて進めるフォーム */
export default function ClaimForm({
  claimId,
  currentStatus,
}: {
  claimId: string;
  currentStatus: InsuranceClaimStatus;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateClaimStatus, {});
  const nextStatuses = NEXT_CLAIM_STATUSES[currentStatus] ?? [];

  if (state.ok) {
    return <p className="text-xs font-semibold text-emerald-700">✓ 更新して申請者へ通知しました</p>;
  }

  if (nextStatuses.length === 0) {
    return <span className="text-xs text-gray-400">操作なし</span>;
  }

  return (
    <form action={formAction} className="min-w-[16rem] space-y-2">
      <input type="hidden" name="id" value={claimId} />
      <input type="hidden" name="current_status" value={currentStatus} />
      <textarea
        name="staff_comment"
        rows={2}
        className={inputCls}
        placeholder="職員コメント(任意・通知メールに記載されます)"
      />
      {state.error && <p className="text-xs font-semibold text-red-600">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((s) => (
          <button key={s} type="submit" name="status" value={s} disabled={pending} className={btnSmall}>
            {pending ? "処理中…" : CLAIM_ACTION_LABELS[s]}
          </button>
        ))}
      </div>
    </form>
  );
}
