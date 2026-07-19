"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { createReimbursement, type ActionState } from "./actions";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export default function ReimbursementForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createReimbursement, {});

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
        <Field label="内容" required className="sm:col-span-2">
          <input name="title" required placeholder="例: ○○研修 交通費" className={inputCls} />
        </Field>
        <Field label="金額" required>
          <input type="number" name="amount" required min={1} placeholder="例: 5000" className={inputCls} />
        </Field>
      </div>
      <Field label="備考">
        <textarea name="notes" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 諸経費を登録しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "登録する"}
        </button>
      </div>
    </form>
  );
}
