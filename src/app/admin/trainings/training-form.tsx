"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import { createTraining, updateTraining, type ActionState } from "./actions";
import { TRAINING_CATEGORIES, STUDENT_STATE_SUFFIX } from "./categories";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
  status: string;
}

export interface TrainingEditValues {
  id: string;
  student_id: string;
  title: string;
  category: string | null;
  date: string;
  result: string | null;
  instructor: string | null;
  notes: string | null;
}

export default function TrainingForm({
  students,
  defaultDate,
  record,
}: {
  students: StudentOption[];
  defaultDate: string;
  record?: TrainingEditValues | null;
}) {
  const isEdit = !!record;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateTraining : createTraining,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {record && <input type="hidden" name="id" value={record.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="生徒" required>
          <select name="student_id" required defaultValue={record?.student_id ?? ""} className={inputCls}>
            <option value="" disabled>
              選択してください
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.student_number}){STUDENT_STATE_SUFFIX[s.status] ?? ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="研修名" required>
          <input
            name="title"
            required
            defaultValue={record?.title ?? ""}
            placeholder="例: 牧場実習 (春季)"
            className={inputCls}
          />
        </Field>
        <Field label="カテゴリ">
          <select name="category" defaultValue={record?.category ?? ""} className={inputCls}>
            <option value="">未分類</option>
            {TRAINING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="日付" required>
          <input
            type="date"
            name="date"
            required
            defaultValue={record?.date ?? defaultDate}
            className={inputCls}
          />
        </Field>
        <Field label="結果">
          <input
            name="result"
            defaultValue={record?.result ?? ""}
            placeholder="例: 修了 / 合格 / 3級取得"
            className={inputCls}
          />
        </Field>
        <Field label="担当講師">
          <input
            name="instructor"
            defaultValue={record?.instructor ?? ""}
            placeholder="例: 佐藤 講師"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="備考">
        <textarea
          name="notes"
          rows={2}
          defaultValue={record?.notes ?? ""}
          placeholder="所感や次回への申し送りなど"
          className={inputCls}
        />
      </Field>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "✓ 研修記録を更新しました" : "✓ 研修記録を登録しました"}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {isEdit && (
          <Link href="/admin/trainings" className={btnSecondary}>
            キャンセル
          </Link>
        )}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : isEdit ? "更新する" : "研修を登録する"}
        </button>
      </div>
    </form>
  );
}
