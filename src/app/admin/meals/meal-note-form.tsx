"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { MealType } from "@/lib/types";
import { inputCls, btnSmall } from "@/components/ui";
import { toggleMeal, type ActionState } from "./actions";

/** 欠食理由の入力候補 (自由記述も可) */
const REASON_PRESETS = ["体調不良", "外泊", "外出", "実習", "その他"];

/**
 * 欠食 (×) のセルにだけ表示する理由入力。
 * 既定は小さなリンクのみで、クリックしたときだけ入力欄を開く (行が縦に伸びないようにするため)。
 * 保存時は note だけを送信するので、○×の状態は変わらない (toggleMeal 側で既存値を維持)。
 */
export default function MealNoteForm({
  studentId,
  date,
  meal,
  note,
  eaten,
}: {
  studentId: string;
  date: string;
  meal: MealType;
  note: string | null;
  /** true (喫食) の場合は、残っている理由メモを編集・削除するためだけに表示する */
  eaten: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(toggleMeal, {});
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const listId = `meal-reason-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    setValue(note ?? "");
  }, [note]);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={note ? `欠食理由: ${note} (クリックで編集)` : "欠食理由を入力"}
        className={`mt-1 block max-w-[6.5rem] truncate text-[10px] font-semibold underline decoration-dotted underline-offset-2 ${
          note
            ? eaten
              ? "text-gray-500 hover:text-gray-800"
              : "text-red-600 hover:text-red-800"
            : "text-gray-400 hover:text-gray-700"
        }`}
      >
        {note ? `📝 ${note}` : "＋理由"}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-1 w-44 border border-gray-300 bg-white p-2 text-left shadow-sm">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <p className="mb-1 text-[11px] font-bold text-gray-600">{eaten ? "メモ" : "欠食理由"}</p>
      <input
        type="text"
        name="note"
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={200}
        placeholder="体調不良 など"
        autoFocus
        className={inputCls}
      />
      <datalist id={listId}>
        {REASON_PRESETS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {REASON_PRESETS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setValue(r)}
            className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" disabled={pending} className={btnSmall}>
          {pending ? "保存中…" : "保存"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-gray-500 hover:underline">
          キャンセル
        </button>
      </div>
      <p className="mt-1 text-[10px] text-gray-400">空欄で保存すると理由を削除します</p>
      {state.error && <p className="mt-1 text-[10px] font-semibold text-red-600">{state.error}</p>}
    </form>
  );
}
