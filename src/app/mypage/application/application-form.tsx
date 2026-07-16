"use client";

import { useActionState, useState } from "react";
import { APPLICATION_DOCUMENTS } from "@/lib/constants";
import { Card, Label, inputCls, btnPrimary } from "@/components/ui";
import { submitApplicationAction, type ActionState } from "./actions";

export default function ApplicationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitApplicationAction, {});
  const [essayLength, setEssayLength] = useState(0);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-3xl">📄</p>
        <p className="mt-2 text-sm font-bold text-emerald-800">出願を受け付けました</p>
        <p className="mt-1 text-sm text-emerald-700">
          郵送書類がまだの場合はお早めにご送付ください。続いて適性検査の受検をお願いします。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <Card title="提出書類の確認">
        <p className="mb-3 text-xs text-gray-500">
          以下の書類は郵送でご提出ください。発送がお済みの書類にチェックを入れてください(自己申告)。
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {APPLICATION_DOCUMENTS.map((doc) => (
            <label
              key={doc.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
            >
              <input type="checkbox" name={`doc_${doc.key}`} className="accent-brand-600" />
              {doc.label} を提出する
            </label>
          ))}
        </div>
      </Card>

      <Card title="作文">
        <Label required>「馬の学校で学びたいこと・将来の目標」(400字目安)</Label>
        <textarea
          name="essay"
          rows={10}
          required
          className={inputCls}
          placeholder="あなたが本学院で学びたいことや、将来の目標を自由にお書きください。"
          onChange={(e) => setEssayLength(e.target.value.length)}
        />
        <p className="mt-1 text-right text-xs text-gray-400">{essayLength}字 / 400字目安</p>
      </Card>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "送信中…" : "出願する"}
      </button>
    </form>
  );
}
