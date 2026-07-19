"use client";

import { useActionState } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { COMPETENCY_CATEGORIES, COMPETENCY_SCORE_LABELS } from "@/lib/constants";
import { saveCompetencyAssessment, type ActionState } from "./actions";

export interface StudentOption {
  id: string;
  name: string;
  student_number: string;
}

export default function CompetencyForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveCompetencyAssessment, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Field label="評価対象の学期" required>
          <input name="term" required placeholder="例: 2026年度 前期" className={inputCls} />
        </Field>
      </div>

      <div className="space-y-4">
        {COMPETENCY_CATEGORIES.map((group) => (
          <div key={group.group} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold text-gray-500">{group.group}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.keys.map((key) => (
                <Field key={key} label={key}>
                  <select name={`score_${key}`} defaultValue="" className={inputCls}>
                    <option value="">未評価</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {COMPETENCY_SCORE_LABELS[n]}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="どれだけの成長があったか">
          <textarea
            name="growth_comment"
            rows={3}
            placeholder="例: 前回に比べて主体性・実行力が大きく向上しました。"
            className={inputCls}
          />
        </Field>
        <Field label="総評">
          <textarea name="overall_comment" rows={3} placeholder="全体的な所見を記入してください" className={inputCls} />
        </Field>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ 社会人基礎力評価を登録しました</p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "評価を登録する"}
        </button>
      </div>
    </form>
  );
}
