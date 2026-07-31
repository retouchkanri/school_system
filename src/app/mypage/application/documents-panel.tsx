"use client";

import { useActionState, useEffect, useState } from "react";
import { Section, Badge, inputCls, btnSmall } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  updateApplicationDocumentAction,
  updateApplicationEssayAction,
  type ActionState,
} from "./actions";

export interface DocInfo {
  key: string;
  label: string;
  kind: "file" | "text";
  submitted: boolean;
  url: string | null;
}

function FileEditForm({ docKey, onDone }: { docKey: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateApplicationDocumentAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) {
      showSuccessToast("書類を更新しました");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="doc_key" value={docKey} />
      <input
        type="file"
        name="file"
        required
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="min-w-0 flex-1 text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
      />
      <button type="submit" disabled={pending} className={`${btnSmall} shrink-0`}>
        {pending ? "送信中…" : "保存"}
      </button>
    </form>
  );
}

function EssayEditForm({ essay, onDone }: { essay: string | null; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateApplicationEssayAction, {});
  const [length, setLength] = useState(essay?.length ?? 0);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) {
      showSuccessToast("作文を更新しました");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="essay"
        rows={8}
        required
        defaultValue={essay ?? ""}
        className={inputCls}
        onChange={(e) => setLength(e.target.value.length)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{length}字 / 400字目安</p>
        <button type="submit" disabled={pending} className={btnSmall}>
          {pending ? "送信中…" : "保存"}
        </button>
      </div>
    </form>
  );
}

export default function ApplicationDocumentsPanel({
  docs,
  essay,
  editable,
}: {
  docs: DocInfo[];
  essay: string | null;
  editable: boolean;
}) {
  const [editingFileKey, setEditingFileKey] = useState<string | null>(null);
  const [editingEssay, setEditingEssay] = useState(false);

  return (
    <>
      <Section title="提出書類" className="mb-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {docs.map((doc) => {
            const isEssay = doc.kind === "text";
            const isEditingThis = isEssay ? editingEssay : editingFileKey === doc.key;
            return (
              <div
                key={doc.key}
                className={`border px-3 py-2.5 text-sm ${
                  doc.submitted ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span>{doc.label}</span>
                  <span className="flex items-center gap-2">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        表示
                      </a>
                    )}
                    <Badge tone={doc.submitted ? "green" : "gray"}>{doc.submitted ? "提出済" : "未提出"}</Badge>
                    {editable && (
                      <button
                        type="button"
                        onClick={() =>
                          isEssay
                            ? setEditingEssay((v) => !v)
                            : setEditingFileKey((k) => (k === doc.key ? null : doc.key))
                        }
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        {isEditingThis ? "閉じる" : doc.submitted ? "再提出" : "提出する"}
                      </button>
                    )}
                  </span>
                </div>
                {editable && isEditingThis && !isEssay && (
                  <FileEditForm docKey={doc.key} onDone={() => setEditingFileKey(null)} />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {editable
            ? "※ 各書類はクリックすると再提出・差し替えができます。未提出の書類がある場合はお早めにご提出ください。"
            : "※ 選考結果が確定しているため、提出書類の編集はできません。"}
        </p>
      </Section>

      <Section title="作文" className="mb-6">
        {editable && editingEssay ? (
          <EssayEditForm essay={essay} onDone={() => setEditingEssay(false)} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{essay ?? "—"}</p>
        )}
      </Section>
    </>
  );
}
