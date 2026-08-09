"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { createRidingReport, type ActionState } from "./actions";
import EvalFields from "./eval-fields";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export interface HorseOption {
  id: string;
  name: string;
  is_retouch: boolean;
}

export default function ReportForm({
  students,
  horses,
  defaultDate,
}: {
  students: StudentOption[];
  horses: HorseOption[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createRidingReport, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="生徒" required>
          <select name="student_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              選択してください
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.student_number})
              </option>
            ))}
          </select>
        </Field>
        <Field label="馬" required>
          <select name="horse_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              選択してください
            </option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.is_retouch ? " (リタッチ)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日付" required>
          <input type="date" name="report_date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="時限・授業名">
          <input name="lesson" placeholder="例: 2限 馬場騎乗" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="騎乗内容" required>
          <textarea
            name="content"
            required
            rows={3}
            placeholder="例: 速歩の姿勢確認と軽速歩の練習。歩様は安定していた。"
            className={inputCls}
          />
        </Field>
        <Field label="馬の状態">
          <textarea
            name="horse_condition"
            rows={3}
            placeholder="例: 食欲あり。左前肢にやや疲れが見られる。"
            className={inputCls}
          />
        </Field>
      </div>

      <EvalFields />

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 騎乗報告を登録しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "報告を登録する"}
        </button>
      </div>
    </form>
  );
}
