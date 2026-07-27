"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Check } from "lucide-react";
import { ENROLLMENT_ID_DOCUMENTS } from "@/lib/constants";
import { showErrorToast } from "@/lib/toast";
import { uploadEnrollmentDocumentAction, type ActionState } from "./actions";

/** アップロード前に表示する見本イラスト (Crowdworks等の本人確認書類アップロードUIを参考にしたシンプルなカード枠) */
function SampleCardIcon({ side }: { side: "front" | "back" }) {
  return (
    <svg viewBox="0 0 120 76" className="h-16 w-24 text-gray-300" fill="none" aria-hidden>
      <rect x="2" y="2" width="116" height="72" rx="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 5" />
      {side === "front" ? (
        <>
          <rect x="14" y="16" width="26" height="32" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="48" y="20" width="58" height="6" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="48" y="32" width="46" height="6" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="48" y="44" width="36" height="6" rx="3" fill="currentColor" opacity="0.5" />
        </>
      ) : (
        <>
          <rect x="14" y="16" width="92" height="10" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="14" y="34" width="92" height="6" rx="3" fill="currentColor" opacity="0.4" />
          <rect x="14" y="44" width="66" height="6" rx="3" fill="currentColor" opacity="0.4" />
          <rect x="14" y="54" width="50" height="6" rx="3" fill="currentColor" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

function IdImageSlot({
  docKey,
  side,
  sideLabel,
  initialUrl,
}: {
  docKey: string;
  side: "front" | "back";
  sideLabel: string;
  initialUrl: string | null;
}) {
  const fileKey = `${docKey}_${side}`;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(uploadEnrollmentDocumentAction, {});
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploaded, setUploaded] = useState(!!initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) setUploaded(true);
  }, [state]);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setUploaded(false);
    const fd = new FormData();
    fd.set("file_key", fileKey);
    fd.set("file", file);
    formAction(fd);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="group relative flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${sideLabel}のプレビュー`} className="h-20 w-32 rounded-md object-cover" />
        ) : (
          <SampleCardIcon side={side} />
        )}
        <span className="text-xs font-semibold text-gray-600">
          {pending ? "アップロード中…" : preview ? `${sideLabel}を変更` : `${sideLabel}をアップロード`}
        </span>
        {uploaded && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Check className="h-4 w-4" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}

export default function IdDocumentsSection({ documentUrls }: { documentUrls: Record<string, string | null> }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
        <span className="mt-0.5">⚠️</span>
        <p>
          書類の四隅が切れないよう、全体が写るように撮影してください。文字がはっきり読み取れる、ピントの合った鮮明な画像をご用意ください。
        </p>
      </div>

      {ENROLLMENT_ID_DOCUMENTS.map((doc) => (
        <div key={doc.key}>
          <p className="mb-2 text-sm font-semibold text-gray-700">{doc.label}</p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <IdImageSlot
              docKey={doc.key}
              side="front"
              sideLabel="表面"
              initialUrl={documentUrls[`${doc.key}_front`] ?? null}
            />
            <IdImageSlot
              docKey={doc.key}
              side="back"
              sideLabel="裏面"
              initialUrl={documentUrls[`${doc.key}_back`] ?? null}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
