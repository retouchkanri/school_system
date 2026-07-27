"use client";

import { Fragment, useActionState, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { ADMISSION_RESULT_LABELS, DECISION_DOCUMENTS } from "@/lib/constants";
import { Badge, Table, Td, Label, btnSmall, type BadgeTone } from "@/components/ui";
import { amendDecisionAction, type DecisionActionState } from "./actions";
import type { AdmissionResult } from "@/lib/types";

export interface DecisionRow {
  id: string;
  leadName: string;
  result: AdmissionResult;
  notifiedVia: string[];
  documentsSent: Record<string, boolean>;
  aiProbability: number | null;
  aiSummary: string | null;
  amendedAt: string | null;
  notifiedAt: string | null;
}

const RESULT_TONES: Record<AdmissionResult, BadgeTone> = {
  accepted: "green",
  rejected: "red",
  waitlist: "amber",
};

const NOTIFY_LABELS: Record<string, string> = {
  email: "メール",
  line: "LINE",
  postal: "郵送",
};

const RESULT_STYLES: Record<AdmissionResult, string> = {
  accepted: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700",
  rejected: "peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700",
  waitlist: "peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700",
};

function AmendForm({ decision }: { decision: DecisionRow }) {
  const [state, formAction, pending] = useActionState<DecisionActionState, FormData>(amendDecisionAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="decision_id" value={decision.id} />
      <div>
        <Label required>結果</Label>
        <div className="flex max-w-sm gap-2">
          {(Object.keys(ADMISSION_RESULT_LABELS) as AdmissionResult[]).map((r) => (
            <label key={r} className="flex-1">
              <input
                type="radio"
                name="result"
                value={r}
                required
                defaultChecked={r === decision.result}
                className="peer sr-only"
              />
              <span
                className={`block cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-600 transition hover:bg-gray-50 ${RESULT_STYLES[r]}`}
              >
                {ADMISSION_RESULT_LABELS[r]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label required>通知方法</Label>
        <div className="flex flex-wrap gap-2">
          {(["email", "line", "postal"] as const).map((v) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                name="notified_via"
                value={v}
                defaultChecked={decision.notifiedVia.includes(v)}
                className="accent-brand-600"
              />
              {NOTIFY_LABELS[v]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>同封書類</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DECISION_DOCUMENTS.map((doc) => (
            <label
              key={doc.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50"
            >
              <input
                type="checkbox"
                name={`doc_${doc.key}`}
                defaultChecked={decision.documentsSent[doc.key] === true}
                className="accent-brand-600"
              />
              {doc.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          ✓ 判定を更新し、訂正の通知を送信しました
        </p>
      )}

      <button type="submit" disabled={pending} className={btnSmall}>
        {pending ? "送信中…" : "更新して訂正通知を送る"}
      </button>
    </form>
  );
}

export default function DecisionsTable({ decisions }: { decisions: DecisionRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Table headers={["氏名", "結果", "判定方法", "通知方法", "通知日時", ""]}>
      {decisions.map((d) => (
        <Fragment key={d.id}>
          <tr className="hover:bg-gray-50">
            <Td className="font-medium text-gray-900">{d.leadName}</Td>
            <Td>
              <Badge tone={RESULT_TONES[d.result]}>{ADMISSION_RESULT_LABELS[d.result]}</Badge>
            </Td>
            <Td>
              {d.aiProbability != null ? (
                <div>
                  <Badge tone="brand">AI自動判定 {d.aiProbability}点</Badge>
                  {d.aiSummary && (
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-gray-500">{d.aiSummary}</p>
                  )}
                  {d.amendedAt && (
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      ※管理者が変更済み ({fmtDateTime(d.amendedAt)})
                    </p>
                  )}
                </div>
              ) : (
                <Badge tone="gray">管理者登録{d.amendedAt ? "・変更済み" : ""}</Badge>
              )}
            </Td>
            <Td className="text-gray-600">
              {d.notifiedVia.length > 0 ? d.notifiedVia.map((v) => NOTIFY_LABELS[v] ?? v).join(" / ") : "—"}
            </Td>
            <Td className="text-gray-600">{fmtDateTime(d.notifiedAt)}</Td>
            <Td>
              <button
                type="button"
                onClick={() => setEditingId(editingId === d.id ? null : d.id)}
                className={btnSmall}
              >
                {editingId === d.id ? "閉じる" : "変更する"}
              </button>
            </Td>
          </tr>
          {editingId === d.id && (
            <tr className="bg-gray-50/60">
              <td colSpan={6} className="px-4 py-4">
                <AmendForm decision={d} />
              </td>
            </tr>
          )}
        </Fragment>
      ))}
    </Table>
  );
}
