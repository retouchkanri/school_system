"use client";

import { useActionState } from "react";
import { createEventAction, type EventActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";

export default function EventForm() {
  const [state, formAction, pending] = useActionState<EventActionState, FormData>(
    createEventAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="タイトル" required className="lg:col-span-2">
          <input name="title" required className={inputCls} placeholder="オープンキャンパス(乗馬体験付き)" />
        </Field>
        <Field label="開催日" required>
          <input name="event_date" type="date" required className={inputCls} />
        </Field>
        <Field label="開始時間">
          <input name="start_time" type="time" className={inputCls} defaultValue="10:00" />
        </Field>
        <Field label="定員">
          <input name="capacity" type="number" min={1} defaultValue={20} className={inputCls} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="参加費(円)">
          <input name="fee" type="number" min={0} step={100} defaultValue={8000} className={inputCls} />
        </Field>
        <Field label="説明" className="sm:col-span-1 lg:col-span-4">
          <textarea
            name="description"
            rows={2}
            className={inputCls}
            placeholder="当日の内容・持ち物・集合場所など"
          />
        </Field>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ イベントを作成しました
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "送信中…" : "イベントを作成"}
      </button>
    </form>
  );
}
