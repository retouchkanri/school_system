"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { GRADE_EVALUATION_OPTIONS } from "@/lib/constants";
import { createGradeRecord, type ActionState } from "./actions";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export default function GradeForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createGradeRecord, {});

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
        <Field label="学期" required>
          <input name="term" required placeholder="例: 1年次 前期" className={inputCls} />
        </Field>
        <Field label="科目" required>
          <input name="subject" required placeholder="例: 馬術実技" className={inputCls} />
        </Field>
        <Field label="評価">
          <select name="evaluation" defaultValue="" className={inputCls}>
            <option value="">未設定</option>
            {GRADE_EVALUATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="点数 (0〜100・任意)">
          <input type="number" name="score" min={0} max={100} placeholder="例: 85" className={inputCls} />
        </Field>
        <Field label="コメント" className="sm:col-span-2">
          <textarea name="comment" rows={2} placeholder="例: 実技の姿勢が安定してきました。" className={inputCls} />
        </Field>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 成績を登録しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "成績を登録する"}
        </button>
      </div>
    </form>
  );
}
