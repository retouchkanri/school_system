"use client";

import { useActionState } from "react";
import { updateApplicationStatusAction, type ApplicationActionState } from "./actions";
import { inputCls, btnSmall } from "@/components/ui";

export default function StatusForm({
  applicationId,
  currentStatus,
  interviewDate,
}: {
  applicationId: string;
  currentStatus: string;
  interviewDate: string | null;
}) {
  const [state, formAction, pending] = useActionState<ApplicationActionState, FormData>(
    updateApplicationStatusAction,
    {}
  );

  const defaultStatus =
    currentStatus === "under_review" || currentStatus === "interview_scheduled"
      ? currentStatus
      : "under_review";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="application_id" value={applicationId} />
      <select
        name="status"
        defaultValue={defaultStatus}
        className={`${inputCls} w-auto py-1 text-xs`}
        aria-label="ステータス"
      >
        <option value="under_review">審査中</option>
        <option value="interview_scheduled">面接日程確定</option>
      </select>
      <input
        type="date"
        name="interview_date"
        defaultValue={interviewDate ?? ""}
        className={`${inputCls} w-auto py-1 text-xs`}
        aria-label="面接日"
      />
      <button type="submit" disabled={pending} className={btnSmall}>
        {pending ? "送信中…" : "更新"}
      </button>
      {state.ok && <span className="text-xs font-semibold text-emerald-600">✓ 更新済</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
