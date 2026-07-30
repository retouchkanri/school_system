"use client";

import { useActionState } from "react";
import { createHorseAction, updateHorseAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary, btnSmall } from "@/components/ui";
import { HORSE_SEX_OPTIONS } from "@/lib/constants";
import type { Horse } from "@/lib/types";

function HorseFields({ horse }: { horse?: Horse }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="名前" required>
          <input name="name" required defaultValue={horse?.name} className={inputCls} placeholder="例: サクラ" />
        </Field>
        <Field label="品種">
          <input name="breed" defaultValue={horse?.breed ?? ""} className={inputCls} placeholder="例: サラブレッド" />
        </Field>
        <Field label="毛色">
          <input name="color" defaultValue={horse?.color ?? ""} className={inputCls} placeholder="例: 鹿毛" />
        </Field>
        <Field label="性別">
          <select name="sex" defaultValue={horse?.sex ?? ""} className={inputCls}>
            <option value="">未設定</option>
            {HORSE_SEX_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="生年月日">
          <input type="date" name="birth_date" defaultValue={horse?.birth_date ?? ""} className={inputCls} />
        </Field>
        <Field label="年齢">
          <input
            name="age"
            type="number"
            min={0}
            max={50}
            defaultValue={horse?.age ?? ""}
            className={inputCls}
            placeholder="例: 12"
          />
        </Field>
        <Field label="馬房">
          <input name="stall" defaultValue={horse?.stall ?? ""} className={inputCls} placeholder="例: A-3" />
        </Field>
        <Field label="マイクロチップ番号">
          <input name="microchip" defaultValue={horse?.microchip ?? ""} className={inputCls} placeholder="例: 392..." />
        </Field>
        <Field label="馬主・所有者">
          <input name="owner" defaultValue={horse?.owner ?? ""} className={inputCls} placeholder="例: ◯◯牧場" />
        </Field>
        <Field label="来場日">
          <input type="date" name="arrived_on" defaultValue={horse?.arrived_on ?? ""} className={inputCls} />
        </Field>
        <Field label="退場日">
          <input type="date" name="departed_on" defaultValue={horse?.departed_on ?? ""} className={inputCls} />
        </Field>
        <Field label="写真URL">
          <input name="photo_url" defaultValue={horse?.photo_url ?? ""} className={inputCls} placeholder="/images/horse-1.jpg" />
        </Field>
        <Field label="保険会社">
          <input
            name="insurance_company"
            defaultValue={horse?.insurance_company ?? ""}
            className={inputCls}
            placeholder="例: ◯◯損害保険"
          />
        </Field>
        <Field label="保険満了日">
          <input
            type="date"
            name="insurance_expires_on"
            defaultValue={horse?.insurance_expires_on ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="メモ">
        <textarea
          name="notes"
          rows={2}
          defaultValue={horse?.notes ?? ""}
          className={inputCls}
          placeholder="性格・健康状態・注意点など"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={horse ? horse.active : true}
            className="accent-brand-600"
          />
          在厩中(退厩した馬はチェックを外す)
        </label>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="is_retouch" defaultChecked={horse?.is_retouch} className="accent-brand-600" />
          リタッチ馬(引退馬支援の対象)にする
        </label>
      </div>
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
