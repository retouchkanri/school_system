"use client";

import { useActionState } from "react";
import { submitParentAbsenceRequest, type ParentAbsenceActionState } from "./actions";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import type { AttendanceStatus } from "@/lib/types";

const KIND_OPTIONS: AttendanceStatus[] = ["absent", "late", "early_leave"];

export default function ParentAbsenceForm({
  students,
  defaultDate,
}: {
  students: { id: string; name: string; student_number: string }[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<ParentAbsenceActionState, FormData>(
    submitParentAbsenceRequest,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 欠席・遅刻の連絡を送信しました。
        </p>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      {students.length > 1 ? (
        <Field label="お子様" required>
          <select name="student_id" required defaultValue={students[0].id} className={inputCls}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}({s.student_number})
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="student_id" value={students[0].id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="日付" required>
          <input type="date" name="date" required defaultValue={defaultDate} className={inputCls} />
        </Field>
        <Field label="区分" required>
          <select name="kind" required defaultValue="absent" className={inputCls}>
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {ATTENDANCE_STATUS_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="理由" required>
        <input name="reason" required className={inputCls} placeholder="例: 発熱のため" />
      </Field>

      <Field label="補足">
        <textarea name="detail" rows={2} className={inputCls} placeholder="例: 午後から登校させる予定です。" />
      </Field>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "連絡を送信する"}
      </button>
    </form>
  );
}
