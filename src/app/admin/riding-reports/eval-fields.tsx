"use client";

import { Field, inputCls } from "@/components/ui";
import { RIDEABILITY_LABELS, HORSE_MOOD_OPTIONS } from "@/lib/constants";

/** 「馬の様子」の選択肢 (共通定数 + 元気がなかった) */
export const MOOD_CHOICES = [...HORSE_MOOD_OPTIONS, "元気がなかった"];

export const RIDEABILITY_CHOICES = [5, 4, 3, 2, 1];

export interface EvalDefaults {
  fell_off?: boolean;
  rideability?: number | null;
  horse_mood?: string | null;
  incident?: string | null;
}

/** 騎乗報告の評価項目 (落馬・乗りやすさ・馬の様子・ヒヤリハット) */
export default function EvalFields({ defaults }: { defaults?: EvalDefaults }) {
  return (
    <div className="space-y-4 border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold text-gray-600">馬の評価(馬ごとの集計に使われます)</p>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          name="fell_off"
          defaultChecked={defaults?.fell_off ?? false}
          className="accent-red-600"
        />
        落馬しましたか(落馬した場合はチェック)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="この馬の乗りやすさ">
          <select
            name="rideability"
            defaultValue={defaults?.rideability != null ? String(defaults.rideability) : ""}
            className={inputCls}
          >
            <option value="">未回答</option>
            {RIDEABILITY_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n} : {RIDEABILITY_LABELS[n]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="馬の様子">
          <select name="horse_mood" defaultValue={defaults?.horse_mood ?? ""} className={inputCls}>
            <option value="">未回答</option>
            {MOOD_CHOICES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="ヒヤリハット・特記事項">
        <textarea
          name="incident"
          rows={2}
          defaultValue={defaults?.incident ?? ""}
          className={inputCls}
          placeholder="例: 洗い場で急に動いた。物見をして横に飛んだ。"
        />
      </Field>
    </div>
  );
}
