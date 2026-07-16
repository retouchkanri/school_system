"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { createTraining, type ActionState } from "./actions";

export const TRAINING_CATEGORIES = ["校外研修", "資格", "講習", "実習"];

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export default function TrainingForm({
  students,
  defaultDate,
}: {
  students: StudentOption[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createTraining, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <Field label="研修名" required>
          <input name="title" required placeholder="例: 牧場実習 (春季)" className={inputCls} />
        </Field>
        <Field label="カテゴリ">
          <select name="category" defaultValue="" className={inputCls}>
            <option value="">未分類</option>
            {TRAINING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日付" required>
          <input type="date" name="date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="結果">
          <input name="result" placeholder="例: 修了 / 合格 / 3級取得" className={inputCls} />
        </Field>
        <Field label="担当講師">
          <input name="instructor" placeholder="例: 佐藤 講師" className={inputCls} />
        </Field>
      </div>
      <Field label="備考">
        <textarea name="notes" rows={2} placeholder="所感や次回への申し送りなど" className={inputCls} />
      </Field>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 研修記録を登録しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "研修を登録する"}
        </button>
      </div>
    </form>
  );
}
