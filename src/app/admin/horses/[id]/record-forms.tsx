"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { HORSE_MOVEMENT_KIND_LABELS, FARRIER_KIND_OPTIONS } from "@/lib/constants";
import type { HorseMovementKind } from "@/lib/types";
import {
  createHorseMovementAction,
  createHorseVaccinationAction,
  createHorseFarrierAction,
  deleteHorseRecordAction,
  type ActionState,
} from "../actions";

/** テーブル行に収まる赤系の小ボタン (btnSmall と同じ寸法・危険操作用) */
const btnSmallDanger =
  "inline-flex items-center justify-center gap-1 border border-red-600 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition duration-300 ease-out hover:bg-red-600 hover:text-white disabled:opacity-50";

const MOVEMENT_KINDS: HorseMovementKind[] = ["arrival", "departure", "transfer", "return"];

function FormMessages({ state, okMessage }: { state: ActionState; okMessage: string }) {
  return (
    <>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {okMessage}</p>}
    </>
  );
}

/** 送信成功時にフォームを初期化する */
function useResetOnSuccess(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

/** 入退記録の追加フォーム */
export function MovementForm({ horseId, defaultDate }: { horseId: string; defaultDate: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createHorseMovementAction, {});
  const ref = useResetOnSuccess(state.ok);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="horse_id" value={horseId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="区分" required>
          <select name="kind" required defaultValue="arrival" className={inputCls}>
            {MOVEMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {HORSE_MOVEMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日付" required>
          <input type="date" name="date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="相手先">
          <input name="counterpart" className={inputCls} placeholder="例: ◯◯牧場" />
        </Field>
        <Field label="理由">
          <input name="reason" className={inputCls} placeholder="例: 放牧のため" />
        </Field>
      </div>
      <Field label="備考">
        <textarea name="notes" rows={2} className={inputCls} placeholder="輸送手段・立会者など" />
      </Field>
      <FormMessages state={state} okMessage="入退記録を追加しました" />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "登録中…" : "入退記録を追加する"}
      </button>
    </form>
  );
}

/** 予防接種歴の追加フォーム */
export function VaccinationForm({ horseId, defaultDate }: { horseId: string; defaultDate: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createHorseVaccinationAction, {});
  const ref = useResetOnSuccess(state.ok);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="horse_id" value={horseId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ワクチン名" required>
          <input name="vaccine_name" required className={inputCls} placeholder="例: 馬インフルエンザ" />
        </Field>
        <Field label="接種日" required>
          <input type="date" name="date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="次回予定日">
          <input type="date" name="next_due_date" className={inputCls} />
        </Field>
        <Field label="獣医師">
          <input name="veterinarian" className={inputCls} placeholder="例: ◯◯動物病院 △△先生" />
        </Field>
        <Field label="ロット番号">
          <input name="lot_number" className={inputCls} placeholder="例: A1234" />
        </Field>
      </div>
      <Field label="備考">
        <textarea name="notes" rows={2} className={inputCls} placeholder="接種後の様子など" />
      </Field>
      <FormMessages state={state} okMessage="予防接種歴を追加しました" />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "登録中…" : "予防接種歴を追加する"}
      </button>
    </form>
  );
}

/** 装蹄歴の追加フォーム */
export function FarrierForm({ horseId, defaultDate }: { horseId: string; defaultDate: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createHorseFarrierAction, {});
  const ref = useResetOnSuccess(state.ok);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="horse_id" value={horseId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="施術日" required>
          <input type="date" name="date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="種別">
          <select name="kind" defaultValue="" className={inputCls}>
            <option value="">未設定</option>
            {FARRIER_KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="装蹄師">
          <input name="farrier" className={inputCls} placeholder="例: ◯◯装蹄所" />
        </Field>
        <Field label="次回予定日">
          <input type="date" name="next_due_date" className={inputCls} />
        </Field>
      </div>
      <Field label="備考">
        <textarea name="notes" rows={2} className={inputCls} placeholder="蹄の状態・使用した蹄鉄など" />
      </Field>
      <FormMessages state={state} okMessage="装蹄歴を追加しました" />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "登録中…" : "装蹄歴を追加する"}
      </button>
    </form>
  );
}

/** サブ記録の削除ボタン (確認ダイアログつき) */
export function DeleteRecordButton({
  record,
  id,
  horseId,
  confirmLabel,
}: {
  record: "movement" | "vaccination" | "farrier";
  id: string;
  horseId: string;
  confirmLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteHorseRecordAction, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`${confirmLabel}を削除します。この操作は取り消せません。よろしいですか?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="record" value={record} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="horse_id" value={horseId} />
      <button type="submit" disabled={pending} className={btnSmallDanger}>
        {pending ? "削除中…" : "削除"}
      </button>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
