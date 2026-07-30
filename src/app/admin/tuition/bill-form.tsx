"use client";

import { useActionState, useEffect, useState } from "react";
import { Card, Field, inputCls, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { createTuitionBillsAction, type ActionState } from "./actions";
import type { TuitionStudent } from "./data";

type Target = "all" | "class" | "student";

const TARGET_OPTIONS: { value: Target; label: string }[] = [
  { value: "all", label: "在籍生徒 全員" },
  { value: "class", label: "クラス指定" },
  { value: "student", label: "個別の生徒" },
];

/** 学費請求の一括登録フォーム (同じ生徒・同じ名目の重複は自動でスキップされる) */
export default function BillForm({
  students,
  classes,
}: {
  students: TuitionStudent[];
  classes: string[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createTuitionBillsAction, {});
  const [target, setTarget] = useState<Target>("all");

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok && state.message) showSuccessToast(state.message);
  }, [state]);

  return (
    <Card title="請求の一括登録">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="対象" required>
            <select
              name="target"
              value={target}
              onChange={(e) => setTarget(e.target.value as Target)}
              className={inputCls}
            >
              {TARGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {target === "class" && (
            <Field label="クラス" required>
              <select name="class_name" defaultValue="" className={inputCls}>
                <option value="">選択してください</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {target === "student" && (
            <Field label="生徒" required>
              <select name="student_id" defaultValue="" className={inputCls}>
                <option value="">選択してください</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_number} {s.name}
                    {s.class_name ? ` (${s.class_name})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="名目 (例: 2026年度 前期)" required>
            <input
              name="installment_label"
              required
              maxLength={60}
              placeholder="2026年度 前期"
              className={inputCls}
            />
          </Field>

          <Field label="金額 (円)" required>
            <input name="amount" type="number" min={1} step={1} required placeholder="300000" className={inputCls} />
          </Field>

          <Field label="納付期限" required>
            <input name="due_date" type="date" required className={inputCls} />
          </Field>

          <Field label="備考 (任意)" className="sm:col-span-2">
            <input name="memo" maxLength={200} placeholder="振込手数料は各自ご負担ください 等" className={inputCls} />
          </Field>
        </div>

        <p className="text-xs text-gray-400">
          ※ 同じ生徒・同じ名目の請求が既にある場合は作成せずスキップします (二重請求の防止)。
        </p>

        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "登録中…" : "請求を登録する"}
        </button>

        {state.ok && state.message && (
          <p className="text-sm font-bold text-emerald-700">✓ {state.message}</p>
        )}
      </form>
    </Card>
  );
}
