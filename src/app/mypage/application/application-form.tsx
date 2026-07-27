"use client";

import { useActionState, useEffect, useState } from "react";
import { APPLICATION_FILE_DOCUMENTS } from "@/lib/constants";
import { Card, Label, inputCls, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { submitApplicationAction, type ActionState } from "./actions";

function FileField({ docKey, label }: { docKey: string; label: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <label
      className="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50 has-[:focus]:border-brand-500"
    >
      <span className="font-medium">{label}</span>
      <input
        type="file"
        name={`doc_${docKey}`}
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      {fileName && <span className="text-xs text-emerald-600">選択中: {fileName}</span>}
    </label>
  );
}

export default function ApplicationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitApplicationAction, {});
  const [essayLength, setEssayLength] = useState(0);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("出願を受け付けました");
  }, [state]);

  if (state.ok) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 p-6 text-center">
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
      <Card title="提出書類のアップロード">
        <p className="mb-3 text-xs text-gray-500">
          以下の書類をアップロードしてください(PDF・PNG・JPEG・WEBP、10MBまで)。ファイルの用意が難しい場合は郵送でもご提出いただけます。
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {APPLICATION_FILE_DOCUMENTS.map((doc) => (
            <FileField key={doc.key} docKey={doc.key} label={doc.label} />
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

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "送信中…" : "出願する"}
      </button>
    </form>
  );
}
