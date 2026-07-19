"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { CAREER_OUTCOME_LABELS } from "@/lib/constants";
import { createCareerRecord, type ActionState } from "./actions";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export default function CareerForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createCareerRecord, {});

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
        <Field label="区分" required>
          <select name="outcome_type" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              選択してください
            </option>
            {(Object.keys(CAREER_OUTCOME_LABELS) as (keyof typeof CAREER_OUTCOME_LABELS)[]).map((k) => (
              <option key={k} value={k}>
                {CAREER_OUTCOME_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="就職先・進学先名" required>
          <input name="organization" required placeholder="例: ○○competition牧場" className={inputCls} />
        </Field>
        <Field label="職種・コース">
          <input name="position" placeholder="例: 育成スタッフ" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="決定日">
          <input type="date" name="decided_date" className={inputCls} />
        </Field>
        <Field label="備考">
          <textarea name="notes" rows={2} className={inputCls} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 rounded border-gray-300" />
        本人・保護者へメール/LINEで通知する
      </label>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 進路を登録しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "進路を登録する"}
        </button>
      </div>
    </form>
  );
}
