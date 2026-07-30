"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import { INJURY_OCCURRED_OPTIONS, INJURY_SEVERITY_OPTIONS } from "@/lib/constants";
import { createInjury, updateInjury, type ActionState } from "./actions";
import { STUDENT_STATE_SUFFIX } from "./options";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
  status: string;
}

export interface HorseOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InjuryEditValues {
  id: string;
  student_id: string;
  date: string;
  occurred_at: string | null;
  horse_id: string | null;
  body_part: string | null;
  description: string;
  severity: string | null;
  treatment: string | null;
  hospital: string | null;
  doctor_note: string | null;
}

export default function InjuryForm({
  students,
  horses,
  defaultDate,
  record,
}: {
  students: StudentOption[];
  horses: HorseOption[];
  defaultDate: string;
  record?: InjuryEditValues | null;
}) {
  const isEdit = !!record;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateInjury : createInjury,
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
        <Field label="発生日" required>
          <input type="date" name="date" required defaultValue={record?.date ?? defaultDate} className={inputCls} />
        </Field>
        <Field label="発生場面">
          <select name="occurred_at" defaultValue={record?.occurred_at ?? ""} className={inputCls}>
            <option value="">未選択</option>
            {INJURY_OCCURRED_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="関連する馬">
          <select name="horse_id" defaultValue={record?.horse_id ?? ""} className={inputCls}>
            <option value="">なし</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.active ? "" : " ※退厩"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="負傷部位">
          <input
            name="body_part"
            defaultValue={record?.body_part ?? ""}
            placeholder="例: 左手首 / 腰"
            className={inputCls}
          />
        </Field>
        <Field label="程度">
          <select name="severity" defaultValue={record?.severity ?? ""} className={inputCls}>
            <option value="">未選択</option>
            {INJURY_SEVERITY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="症状の説明" required>
        <textarea
          name="description"
          rows={3}
          required
          defaultValue={record?.description ?? ""}
          placeholder="例: 常歩中に落馬。左手首を強く打ち、腫れと痛みを訴えている。"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="処置内容">
          <textarea
            name="treatment"
            rows={2}
            defaultValue={record?.treatment ?? ""}
            placeholder="例: 患部を冷却し固定。保護者へ連絡のうえ受診。"
            className={inputCls}
          />
        </Field>
        <Field label="受診先">
          <input
            name="hospital"
            defaultValue={record?.hospital ?? ""}
            placeholder="例: ○○整形外科"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="医師所見">
        <textarea
          name="doctor_note"
          rows={2}
          defaultValue={record?.doctor_note ?? ""}
          placeholder="例: 左橈骨遠位端骨折。全治4週間。騎乗は当面禁止。"
          className={inputCls}
        />
      </Field>

      <p className="text-xs text-gray-500">
        程度が「通院」「入院」の場合のみ、登録時に本人・保護者へメールとLINEでお知らせします。
      </p>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {isEdit ? "✓ 怪我記録を更新しました" : "✓ 怪我記録を登録しました"}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {isEdit && (
          <Link href="/admin/injuries" className={btnSecondary}>
            キャンセル
          </Link>
        )}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : isEdit ? "更新する" : "怪我記録を登録する"}
        </button>
      </div>
    </form>
  );
}
