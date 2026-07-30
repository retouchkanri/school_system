"use client";

import { useActionState, useEffect } from "react";
import { btnSmall } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { deleteSharedPhotoAction, notifySharedPhotoAction, type ActionState } from "./actions";

function NotifyButton({ id, notified }: { id: string; notified: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(notifySharedPhotoAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast(`${state.notified ?? 0}件の宛先へ通知しました`);
  }, [state]);

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm(notified ? "この写真の通知を再送します。よろしいですか?" : "この写真の公開を通知します。よろしいですか?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={btnSmall}>
        {pending ? "送信中…" : notified ? "再通知" : "通知する"}
      </button>
    </form>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteSharedPhotoAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("写真を削除しました");
  }, [state]);

  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (!window.confirm("この写真を削除します。生徒・保護者からも見えなくなります。よろしいですか?")) {
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

export default function PhotoRowActions({ id, notified }: { id: string; notified: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <NotifyButton id={id} notified={notified} />
      <DeleteButton id={id} />
    </div>
  );
}
