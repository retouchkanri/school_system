"use client";

import { useActionState } from "react";
import { Field, Label, inputCls, btnPrimary } from "@/components/ui";
import { updateStudent, type ActionState } from "./actions";

export interface HorseOption {
  id: string;
  name: string;
  is_retouch: boolean;
}

export interface AccountOption {
  id: string;
  label: string;
}

export interface EditableStudent {
  id: string;
  name: string;
  kana: string | null;
  student_number: string;
  enrollment_date: string | null;
  class_name: string | null;
  dorm_room: string | null;
  assigned_horse_id: string | null;
  stall_number: string | null;
  orientation_info: string | null;
  items_to_bring: string | null;
  dorm_info: string | null;
  class_schedule: string | null;
  uniform_status: string | null;
  user_id: string | null;
  parent_user_id: string | null;
  status: string;
}

export default function StudentEditForm({
  student,
  horses,
  studentAccounts,
  parentAccounts,
}: {
  student: EditableStudent;
  horses: HorseOption[];
  studentAccounts: AccountOption[];
  parentAccounts: AccountOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateStudent, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={student.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="学籍番号" required>
          <input name="student_number" required defaultValue={student.student_number} className={inputCls} />
        </Field>
        <Field label="氏名" required>
          <input name="name" required defaultValue={student.name} className={inputCls} />
        </Field>
        <Field label="フリガナ">
          <input name="kana" defaultValue={student.kana ?? ""} className={inputCls} />
        </Field>
        <Field label="入学日">
          <input type="date" name="enrollment_date" defaultValue={student.enrollment_date ?? ""} className={inputCls} />
        </Field>
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
                {h.is_retouch ? " (リタッチ)" : ""}
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
        <Field label="本人アカウント">
          <select name="user_id" defaultValue={student.user_id ?? ""} className={inputCls}>
            <option value="">未連携</option>
            {studentAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="保護者アカウント">
          <select name="parent_user_id" defaultValue={student.parent_user_id ?? ""} className={inputCls}>
            <option value="">未連携</option>
            {parentAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-xs text-gray-400">
        ※ 本人・保護者アカウントを連携すると、生徒・保護者ポータルの閲覧やメール・LINE通知の宛先として使用されます。アカウントは「システム管理」から作成できます。
      </p>

      <div className="border-t border-gray-100 pt-4">
        <Label>入学者専用ページの案内 (入力すると本人のマイページに表示され、保存時にメール・LINEでも通知されます)</Label>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="オリエンテーション情報">
            <textarea
              name="orientation_info"
              defaultValue={student.orientation_info ?? ""}
              rows={3}
              placeholder="例: 4月8日(水)10:00より本校馬場にて実施します。"
              className={inputCls}
            />
          </Field>
          <Field label="持ち物">
            <textarea
              name="items_to_bring"
              defaultValue={student.items_to_bring ?? ""}
              rows={3}
              placeholder="例: 入学通知書、筆記用具、印鑑"
              className={inputCls}
            />
          </Field>
          <Field label="寮情報 (部屋番号以外のご案内)">
            <textarea
              name="dorm_info"
              defaultValue={student.dorm_info ?? ""}
              rows={3}
              placeholder="例: 入寮日は4月6日(月)です。"
              className={inputCls}
            />
          </Field>
          <Field label="授業スケジュール">
            <textarea
              name="class_schedule"
              defaultValue={student.class_schedule ?? ""}
              rows={3}
              placeholder="例: 月〜金 1限9:00〜 騎乗実習は火・木"
              className={inputCls}
            />
          </Field>
          <Field label="制服発送状況" className="sm:col-span-2">
            <input
              name="uniform_status"
              defaultValue={student.uniform_status ?? ""}
              placeholder="例: 3月25日発送予定"
              className={inputCls}
            />
          </Field>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="notify" defaultChecked className="accent-brand-600" />
          この内容を保存時にメール・LINEで本人に通知する
        </label>
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
