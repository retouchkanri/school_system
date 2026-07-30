"use client";

import { useActionState, useEffect } from "react";
import { btnSmall } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { deleteInjury, type ActionState } from "./actions";

export default function DeleteInjuryButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteInjury, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("怪我記録を削除しました");
  }, [state]);

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("この怪我記録を削除します。よろしいですか?")) {
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
        {pending ? "削除中…" : "削除"}
      </button>
    </form>
  );
}
