"use client";

import { useActionState } from "react";
import { createHorseAction, updateHorseAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary, btnSmall } from "@/components/ui";
import type { Horse } from "@/lib/types";

function HorseFields({ horse }: { horse?: Horse }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="名前" required>
          <input name="name" required defaultValue={horse?.name} className={inputCls} placeholder="例: サクラ" />
        </Field>
        <Field label="品種">
          <input name="breed" defaultValue={horse?.breed ?? ""} className={inputCls} placeholder="例: サラブレッド" />
        </Field>
        <Field label="年齢">
          <input name="age" type="number" min={0} max={50} defaultValue={horse?.age ?? ""} className={inputCls} placeholder="例: 12" />
        </Field>
        <Field label="馬房">
          <input name="stall" defaultValue={horse?.stall ?? ""} className={inputCls} placeholder="例: A-3" />
        </Field>
      </div>
      <Field label="メモ">
        <textarea name="notes" rows={2} defaultValue={horse?.notes ?? ""} className={inputCls} placeholder="性格・健康状態・注意点など" />
      </Field>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="is_retouch" defaultChecked={horse?.is_retouch} className="accent-brand-600" />
        リタッチ馬(引退馬支援の対象)にする
      </label>
    </>
  );
}

/** 新規登録フォーム */
export function HorseCreateForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createHorseAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <HorseFields />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 馬を登録しました</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "登録する"}
      </button>
    </form>
  );
}

/** 各馬の編集フォーム */
export function HorseEditForm({ horse }: { horse: Horse }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateHorseAction, {});
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={horse.id} />
      <HorseFields horse={horse} />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ 保存しました</p>}
      <button type="submit" disabled={pending} className={btnSmall}>
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
