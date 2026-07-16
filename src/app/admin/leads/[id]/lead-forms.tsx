"use client";

import { useActionState } from "react";
import { PROGRESS_STEPS } from "@/lib/constants";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import type { Lead, Profile } from "@/lib/types";
import {
  updateLeadAdminAction,
  markMaterialSentAction,
  runAiJudgementAction,
  updateNotesAction,
  createMypageAccountAction,
  type ActionState,
} from "./actions";

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>;
  }
  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {state.message ?? "保存しました"}</p>
    );
  }
  return null;
}

/* ===== 管理カード: 資料送付日 / ステータス / 担当者 ===== */
export function LeadAdminForm({ lead, staff }: { lead: Lead; staff: Profile[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateLeadAdminAction, {});
  const [sentState, sentAction, sentPending] = useActionState<ActionState, FormData>(markMaterialSentAction, {});

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="lead_id" value={lead.id} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="資料送付日">
            <input
              type="date"
              name="material_sent_date"
              defaultValue={lead.material_sent_date ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="ステータス(手動変更)">
            <select name="status" defaultValue={lead.status} className={inputCls}>
              {PROGRESS_STEPS.map((s, i) => (
                <option key={s.key} value={s.key}>
                  {i + 1}. {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="担当者">
            <select name="assigned_staff" defaultValue={lead.assigned_staff ?? ""} className={inputCls}>
              <option value="">未割当</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "送信中…" : "保存"}
          </button>
          <Feedback state={state} />
        </div>
      </form>

      <div className="border-t border-gray-100 pt-4">
        <form action={sentAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="lead_id" value={lead.id} />
          <button type="submit" disabled={sentPending} className={btnSecondary}>
            📦 {sentPending ? "送信中…" : "資料発送済にする(メール/LINE通知)"}
          </button>
          <Feedback state={sentState} />
        </form>
        <p className="mt-2 text-xs text-gray-400">
          送付日を今日に設定し、ステータスを「資料発送」へ進め、本人へ発送完了通知を送ります。
        </p>
      </div>
    </div>
  );
}

/* ===== AI判定実行ボタン ===== */
export function AiJudgeButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(runAiJudgementAction, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        🤖 {pending ? "AI判定中…" : "AI判定を実行"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

/* ===== メモ欄 ===== */
export function NotesForm({ leadId, notes }: { leadId: string; notes: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateNotesAction, {});
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <textarea
        name="notes"
        rows={4}
        defaultValue={notes ?? ""}
        placeholder="対応履歴・電話内容・保護者からの相談などを記録"
        className={inputCls}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "送信中…" : "メモを保存"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/* ===== マイページアカウント発行 ===== */
export function CreateAccountButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createMypageAccountAction, {});
  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="lead_id" value={leadId} />
        <button type="submit" disabled={pending} className={btnPrimary}>
          🔑 {pending ? "発行中…" : "マイページアカウントを発行"}
        </button>
        <Feedback state={state} />
      </form>
      {state.ok && state.password && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          仮パスワード: <span className="font-mono text-base font-bold">{state.password}</span>
          <p className="mt-1 text-xs text-amber-600">
            本人へメール/LINEで通知済みです。この画面を閉じると再表示できません。
          </p>
        </div>
      )}
      <p className="text-xs text-gray-400">
        登録メールアドレス宛にログインID・仮パスワードを通知し、動画視聴やアンケート回答ができるマイページを開放します。
      </p>
    </div>
  );
}
