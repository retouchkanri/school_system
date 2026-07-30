"use client";

import { useActionState, useState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { submitParentInsuranceClaim, type ParentInsuranceActionState } from "./actions";

export interface ChildOption {
  id: string;
  name: string;
  student_number: string;
}

export interface ParentInjuryOption {
  id: string;
  student_id: string;
  label: string;
}

export default function ParentClaimForm({
  students,
  injuries,
}: {
  students: ChildOption[];
  injuries: ParentInjuryOption[];
}) {
  const [state, formAction, pending] = useActionState<ParentInsuranceActionState, FormData>(
    submitParentInsuranceClaim,
    {}
  );
  // 選択中のお子様に応じて「対象の怪我」の候補を絞り込む
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const options = injuries.filter((i) => i.student_id === studentId);

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 保険申請を送信しました。学校で確認のうえご連絡します。
        </p>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      {students.length > 1 ? (
        <Field label="お子様" required>
          <select
            name="student_id"
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className={inputCls}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}({s.student_number})
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="student_id" value={studentId} />
      )}

      <Field label="対象の怪我">
        <select key={studentId} name="injury_record_id" defaultValue="" className={inputCls}>
          <option value="">該当なし(直接入力)</option>
          {options.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="保険会社">
          <input name="insurance_company" className={inputCls} placeholder="例: ○○損害保険" />
        </Field>
        <Field label="請求予定額 (円)">
          <input type="number" name="claim_amount" min={0} step={1} className={inputCls} placeholder="例: 15000" />
        </Field>
      </div>

      <Field label="事故の概要" required>
        <textarea
          name="incident_summary"
          rows={4}
          required
          className={inputCls}
          placeholder="いつ・どこで・どのような状況で怪我をしたか、その後の通院状況などをご記入ください。"
        />
      </Field>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "保険申請を送信する"}
      </button>
    </form>
  );
}
