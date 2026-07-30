"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendBulkMessageAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import type { BulkAudience, ClassOption } from "./audience";

const AUDIENCE_OPTIONS: { value: BulkAudience; label: string }[] = [
  { value: "students", label: "在校生のみ" },
  { value: "parents", label: "保護者のみ" },
  { value: "both", label: "在校生と保護者の両方" },
];

const SHORT_LABELS: Record<BulkAudience, string> = {
  students: "在校生",
  parents: "保護者",
  both: "在校生+保護者",
};

export default function MessageForm({ classOptions }: { classOptions: ClassOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sendBulkMessageAction, {});
  const [audience, setAudience] = useState<BulkAudience>("both");
  const [classFilter, setClassFilter] = useState("");
  const [viaEmail, setViaEmail] = useState(true);
  const [viaLine, setViaLine] = useState(true);

  const selected = classOptions.find((o) => o.value === classFilter) ?? classOptions[0];
  const stat = selected.stats[audience];
  const emailCount = viaEmail ? stat.email : 0;
  const lineCount = viaLine ? stat.line : 0;
  const reachable = emailCount + lineCount;

  const channelLabel = [viaEmail ? "メール" : null, viaLine ? "LINE" : null].filter(Boolean).join("・");
  const targetLabel = `${SHORT_LABELS[audience]} (${selected.label})`;
  const breakdown =
    audience === "both"
      ? `在校生 ${selected.stats.students.total}名・保護者 ${selected.stats.parents.total}名 (合計 ${stat.total}名)`
      : `${SHORT_LABELS[audience]} ${stat.total}名`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!viaEmail && !viaLine) {
      e.preventDefault();
      window.alert("メール・LINEのいずれかの送信方法を選択してください。");
      return;
    }
    if (reachable === 0) {
      e.preventDefault();
      window.alert(`${targetLabel} には ${channelLabel} を送信できる宛先がありません。`);
      return;
    }
    const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
    const lines = [
      `【送信対象】${selected.label} / ${breakdown}`,
      `【送信方法】${channelLabel} (メール ${emailCount}件 / LINE ${lineCount}件)`,
      `【件名】${title || "(未入力)"}`,
    ];
    if (stat.none > 0) lines.push(`※ ${stat.none}名はメール・LINEのいずれも未登録のため届きません。`);
    lines.push("", "送信後の取り消しはできません。よろしいですか?");
    if (!window.confirm(lines.join("\n"))) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <Field label="送信対象" required>
        <select
          name="audience"
          required
          className={inputCls}
          value={audience}
          onChange={(e) => setAudience(e.target.value as BulkAudience)}
        >
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="クラスで絞り込む">
        <select
          name="class_filter"
          className={inputCls}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          {classOptions.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-xs font-semibold text-gray-500">宛先プレビュー</p>
        <p className="mt-1 text-sm font-semibold text-gray-800">
          送信対象: {targetLabel} {stat.total}名
          <span className="ml-1 font-normal text-gray-600">
            (メール {viaEmail ? `${stat.email}` : "送信しない"} / LINE {viaLine ? `${stat.line}` : "送信しない"})
          </span>
        </p>
        {audience === "both" && (
          <p className="mt-0.5 text-xs text-gray-500">
            内訳: 在校生 {selected.stats.students.total}名 / 保護者 {selected.stats.parents.total}名
            (同一の連絡先は重複を除いて1件として送信します)
          </p>
        )}
        {stat.none > 0 && (
          <p className="mt-1 text-xs font-semibold text-amber-700">
            ※ {stat.none}名はメール・LINEのいずれも未登録のため届きません
          </p>
        )}
        {reachable === 0 && (
          <p className="mt-1 text-xs font-semibold text-red-600">※ 送信できる宛先がありません</p>
        )}
      </div>

      <Field label="件名" required>
        <input name="title" required className={inputCls} placeholder="例: 来週の予定について" />
      </Field>
      <Field label="本文" required>
        <textarea name="body" required rows={6} className={inputCls} placeholder="メッセージ本文を入力してください" />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="via_email"
            checked={viaEmail}
            onChange={(e) => setViaEmail(e.target.checked)}
            className="accent-brand-600"
          />
          📧 メールで送信
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="via_line"
            checked={viaLine}
            onChange={(e) => setViaLine(e.target.checked)}
            className="accent-brand-600"
          />
          💬 LINEで送信
        </label>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p>
            ✓ {state.audienceLabel ?? "宛先"} {state.targetCount ?? 0}名のうち {state.count ?? 0}件へ送信処理を実行しました
            (メール {state.emailCount ?? 0}件 / LINE {state.lineCount ?? 0}件)。
          </p>
          <p className="mt-1 text-xs">
            実際の到達状況は
            <Link href="/admin/notifications" className="mx-1 font-semibold underline">
              送信ログ
            </Link>
            でご確認ください。
          </p>
        </div>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "送信中…" : "✉️ 一斉送信する"}
      </button>
    </form>
  );
}
