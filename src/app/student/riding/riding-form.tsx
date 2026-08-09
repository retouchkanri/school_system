"use client";

import { useActionState } from "react";
import { submitRidingReport, type RidingActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import EvalFields from "./eval-fields";

export interface HorseOption {
  id: string;
  name: string;
  is_retouch: boolean;
}

export default function RidingForm({
  horses,
  defaultHorseId,
  defaultDate,
}: {
  horses: HorseOption[];
  defaultHorseId: string | null;
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<RidingActionState, FormData>(submitRidingReport, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 騎乗報告を送信しました。</p>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="馬" required>
          <select name="horse_id" required defaultValue={defaultHorseId ?? ""} className={inputCls}>
            <option value="" disabled>
              選択してください
            </option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.is_retouch ? `${h.name} (リタッチ)` : h.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日付" required>
          <input type="date" name="report_date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
      </div>

      <Field label="時限・授業名">
        <input name="lesson" className={inputCls} placeholder="例: 2限 馬場騎乗" />
      </Field>

      <Field label="騎乗内容" required>
        <textarea
          name="content"
          required
          rows={4}
          className={inputCls}
          placeholder="例: 常歩・速歩の練習。軽速歩の姿勢を意識して周回した。"
        />
      </Field>

      <Field label="馬の状態">
        <textarea
          name="horse_condition"
          rows={2}
          className={inputCls}
          placeholder="例: 落ち着いていた。左後肢に少し気になる様子あり。"
        />
      </Field>

      <EvalFields />

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "報告を送信する"}
      </button>
    </form>
  );
}
