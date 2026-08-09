"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { sharePhotosAction, type ActionState } from "./actions";
import { MAX_PHOTO_COUNT, MAX_PHOTO_SIZE, PHOTO_AUDIENCE_LABELS, type PhotoAudience } from "./photo-meta";

const AUDIENCE_ORDER: PhotoAudience[] = ["both", "student", "parent"];

export interface PhotoStudentOption {
  id: string;
  name: string;
  student_number: string;
  class_name: string | null;
}

interface Preview {
  url: string;
  name: string;
}

export default function PhotoShareForm({ students }: { students: PhotoStudentOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sharePhotosAction, {});
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** 解放漏れを防ぐため、生成した blob URL を保持する */
  const objectUrls = useRef<string[]>([]);

  function releaseUrls() {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  }

  useEffect(() => releaseUrls, []);

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) {
      showSuccessToast(
        `写真${state.uploaded ?? 0}枚を公開しました${state.notified ? ` (${state.notified}件へ通知)` : ""}`
      );
      formRef.current?.reset();
      releaseUrls();
      setPreviews([]);
      setFileError(null);
    }
  }, [state]);

  function onFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    releaseUrls();
    const next = files.map((f) => {
      const url = URL.createObjectURL(f);
      objectUrls.current.push(url);
      return { url, name: f.name };
    });
    setPreviews(next);

    const tooBig = files.filter((f) => f.size > MAX_PHOTO_SIZE).map((f) => f.name);
    if (tooBig.length > 0) setFileError(`10MBを超える画像があります: ${tooBig.join("、")}`);
    else if (files.length > MAX_PHOTO_COUNT) setFileError(`一度にアップロードできるのは${MAX_PHOTO_COUNT}枚までです`);
    else setFileError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (fileError) {
      e.preventDefault();
      window.alert(fileError);
      return;
    }
    if (previews.length === 0) {
      e.preventDefault();
      window.alert("画像を1枚以上選択してください。");
    }
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <Field label="タイトル" required>
        <input name="title" required className={inputCls} placeholder="例: 春季競技会のスナップ" />
      </Field>

      <Field label="説明">
        <textarea name="description" rows={3} className={inputCls} placeholder="ひとことメッセージ (任意)" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="撮影日">
          <input type="date" name="taken_on" className={inputCls} />
        </Field>
        <Field label="公開先" required>
          <select name="audience" required defaultValue="both" className={inputCls}>
            {AUDIENCE_ORDER.map((a) => (
              <option key={a} value={a}>
                {PHOTO_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="送り先" required>
        <select name="student_id" required defaultValue="all" className={inputCls}>
          <option value="all">全員に公開 (在校生・保護者)</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}({s.student_number}
              {s.class_name ? ` / ${s.class_name}` : ""})
            </option>
          ))}
        </select>
      </Field>

      <Field label="写真ファイル" required>
        <input
          type="file"
          name="files"
          multiple
          required
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onFilesChange}
          className="block w-full text-sm text-gray-600 file:mr-3 file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          PNG・JPEG・WEBP・GIF / 1枚あたり10MBまで / 一度に{MAX_PHOTO_COUNT}枚まで
        </p>
      </Field>

      {previews.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500">選択中の写真 {previews.length}枚</p>
          <div className="grid grid-cols-4 gap-2">
            {previews.map((p) => (
              <div key={p.url} className="border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-16 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {fileError && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{fileError}</p>}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="notify" defaultChecked className="accent-brand-600" />
       公開と同時にメール・LINEで通知する
      </label>

      {state.error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ 写真{state.uploaded ?? 0}枚を公開しました
          {state.notified ? ` (${state.notified}件の宛先へ通知しました)` : ""}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "アップロード中…" : "写真を公開する"}
      </button>
    </form>
  );
}
