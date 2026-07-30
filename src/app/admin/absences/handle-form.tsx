"use client";

import { useActionState } from "react";
import { handleAbsenceRequest, type AbsenceDecisionState } from "./actions";
import { inputCls, btnSmall } from "@/components/ui";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AttendanceStatus } from "@/lib/types";

export default function HandleForm({
  requestId,
  existingAttendance = null,
}: {
  requestId: string;
  /** 同じ生徒・同じ日付に既に登録されている出欠。ある場合は反映すると上書きになる */
  existingAttendance?: AttendanceStatus | null;
}) {
  const [state, formAction, pending] = useActionState<AbsenceDecisionState, FormData>(handleAbsenceRequest, {});

  if (state.ok) {
    return <p className="text-xs font-semibold text-emerald-700">✓ 処理しました</p>;
  }

  // 既存の出欠記録がある場合は上書きになるため、既定ではチェックを外して職員に判断させる
  const willOverwrite = existingAttendance !== null;

  return (
    <form action={formAction} className="min-w-[16rem] space-y-2">
      <input type="hidden" name="id" value={requestId} />
      <input name="staff_comment" className={inputCls} placeholder="職員コメント(任意)" />
      <label className="flex items-start gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          name="reflect"
          defaultChecked={!willOverwrite}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>
          出欠記録にも反映する
          {willOverwrite && (
            <span className="mt-0.5 block font-semibold text-amber-700">
              ※ この日は既に「{ATTENDANCE_STATUS_LABELS[existingAttendance]}」で登録済みです。反映すると上書きされます。
            </span>
          )}
        </span>
      </label>
      {state.error && <p className="text-xs font-semibold text-red-600">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="acknowledged" disabled={pending} className={btnSmall}>
          {pending ? "処理中…" : "受理する"}
        </button>
        <button type="submit" name="decision" value="rejected" disabled={pending} className={btnSmall}>
          {pending ? "処理中…" : "却下する"}
        </button>
      </div>
    </form>
  );
}
