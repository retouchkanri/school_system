"use client";

import { useActionState, useEffect } from "react";
import { PAYMENT_METHOD_LABELS, BANK_TRANSFER_INFO } from "@/lib/constants";
import { Label, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { bookEventAction, type BookingState } from "./actions";

export default function BookingForm({
  eventId,
  skipPayment,
}: {
  eventId: string;
  /** サーバー側の決済スキップ判定 (skipPaymentInDev) を受け取り、表示と挙動を一致させる */
  skipPayment: boolean;
}) {
  const [state, formAction, pending] = useActionState<BookingState, FormData>(bookEventAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("仮予約を受け付けました");
  }, [state]);

  if (state.ok) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-800">仮予約を受け付けました</p>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-bold">お振込のご案内</p>
          <p className="mt-1">下記口座へ参加費のお振込をお願いいたします。入金確認をもって参加確定となります。</p>
          <p className="mt-2 rounded bg-white px-3 py-2 font-semibold">{BANK_TRANSFER_INFO}</p>
          <p className="mt-1 text-xs">※ 振込手数料はご負担ください。お名前は参加者ご本人の氏名でお願いします。</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3 border-t border-gray-100 pt-3">
      <input type="hidden" name="event_id" value={eventId} />
      <Label required>お支払い方法</Label>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PAYMENT_METHOD_LABELS) as (keyof typeof PAYMENT_METHOD_LABELS)[]).map((m) => (
          <label
            key={m}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700"
          >
            <input type="radio" name="payment_method" value={m} required className="accent-brand-600" />
            {PAYMENT_METHOD_LABELS[m]}
            <span className="text-xs text-gray-400">{m === "credit_card" ? "(即時決済)" : "(後日お振込)"}</span>
          </label>
        ))}
      </div>
      {skipPayment && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          決済スキップ中: 予約ボタンを押すと、その場で入金確認済み・参加済みとなり体験アンケートへ進みます (実際の課金は行われません)
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} mt-3 w-full`}>
        {pending ? "送信中…" : "このイベントを予約する"}
      </button>
    </form>
  );
}
