"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";

/** 中央寄せの円形アバター。クリックでファイル選択 */
export default function AvatarPicker({
  name = "avatar",
  initialUrl,
  fallbackInitial,
}: {
  name?: string;
  initialUrl?: string | null;
  fallbackInitial?: string;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  const initial = (fallbackInitial ?? "?").trim().charAt(0) || "?";

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-50"
        aria-label="プロフィール画像を変更"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="プロフィール画像" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-brand-600 text-2xl font-bold text-white">
            {initial}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <Camera className="h-5 w-5" />
        </span>
      </button>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
