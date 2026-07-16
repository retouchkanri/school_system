"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { createStudent, type ActionState } from "./actions";

export interface HorseOption {
  id: string;
  name: string;
  is_retouch: boolean;
}

export default function StudentForm({
  horses,
  defaultDate,
}: {
  horses: HorseOption[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createStudent, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="学籍番号" required>
          <input name="student_number" required placeholder="例: S2026-001" className={inputCls} />
        </Field>
        <Field label="氏名" required>
          <input name="name" required placeholder="例: 山田 太郎" className={inputCls} />
        </Field>
        <Field label="フリガナ">
          <input name="kana" placeholder="例: ヤマダ タロウ" className={inputCls} />
        </Field>
        <Field label="クラス">
          <input name="class_name" placeholder="例: 高等課程1年A" className={inputCls} />
        </Field>
        <Field label="寮部屋">
          <input name="dorm_room" placeholder="例: 201号室" className={inputCls} />
        </Field>
        <Field label="担当馬">
          <select name="assigned_horse_id" defaultValue="" className={inputCls}>
            <option value="">未割当</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.is_retouch ? " 🔁リタッチ" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="馬房">
          <input name="stall_number" placeholder="例: 3番馬房" className={inputCls} />
        </Field>
        <Field label="入学日">
          <input type="date" name="enrollment_date" defaultValue={defaultDate} className={inputCls} />
        </Field>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 生徒を登録しました</p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "生徒を登録する"}
        </button>
      </div>
    </form>
  );
}
