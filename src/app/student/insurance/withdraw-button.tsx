"use client";

import { useActionState, useEffect } from "react";
import { btnSmall } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { withdrawInsuranceClaim, type InsuranceActionState } from "./actions";

export default function WithdrawButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<InsuranceActionState, FormData>(
    withdrawInsuranceClaim,
    {}
  );

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("保険申請を取り下げました");
  }, [state]);

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("この保険申請を取り下げます。申請内容は削除されます。よろしいですか?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className={`${btnSmall} border-red-600 text-red-600 hover:bg-red-600 hover:text-white`}
      >
        {pending ? "取り下げ中…" : "取り下げる"}
      </button>
    </form>
  );
}
