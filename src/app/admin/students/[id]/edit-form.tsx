"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { updateStudent, type ActionState } from "./actions";

export interface HorseOption {
  id: string;
  name: string;
  is_retouch: boolean;
}

export interface EditableStudent {
  id: string;
  class_name: string | null;
  dorm_room: string | null;
  assigned_horse_id: string | null;
  stall_number: string | null;
  status: string;
}

export default function StudentEditForm({
  student,
  horses,
}: {
  student: EditableStudent;
  horses: HorseOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateStudent, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={student.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="クラス">
          <input name="class_name" defaultValue={student.class_name ?? ""} placeholder="例: 高等課程1年A" className={inputCls} />
        </Field>
        <Field label="寮部屋">
          <input name="dorm_room" defaultValue={student.dorm_room ?? ""} placeholder="例: 201号室" className={inputCls} />
        </Field>
        <Field label="担当馬">
          <select name="assigned_horse_id" defaultValue={student.assigned_horse_id ?? ""} className={inputCls}>
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
          <input name="stall_number" defaultValue={student.stall_number ?? ""} placeholder="例: 3番馬房" className={inputCls} />
        </Field>
        <Field label="在籍状況">
          <select name="status" defaultValue={student.status} className={inputCls}>
            <option value="enrolled">在籍</option>
            <option value="graduated">卒業</option>
            <option value="withdrawn">退学</option>
          </select>
        </Field>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 保存しました</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "変更を保存"}
        </button>
      </div>
    </form>
  );
}
