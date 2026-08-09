"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendAnnouncementAction, type ActionState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { AudienceType } from "@/lib/types";
import type { AnnouncementStats } from "./audience";

const AUDIENCE_ORDER: AudienceType[] = ["enrollee", "student", "parent", "supporter", "all"];

const AUDIENCE_NOTES: Partial<Record<AudienceType, string>> = {
  all: "全体宛は在校生・保護者・一口支援者・管理者などの全アカウントに加え、入学決定者(合格済み)にも配信されます",
};

export default function AnnouncementForm({ stats }: { stats: AnnouncementStats }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sendAnnouncementAction, {});
  const [audience, setAudience] = useState<AudienceType>("all");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendLine, setSendLine] = useState(true);

  const stat = stats[audience];
  const emailCount = sendEmail ? stat.email : 0;
  const lineCount = sendLine ? stat.line : 0;
  const reachable = emailCount + lineCount;
  const channelLabel = [sendEmail ? "メール" : null, sendLine ? "LINE" : null].filter(Boolean).join("・");
  const audienceLabel = AUDIENCE_LABELS[audience];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!sendEmail && !sendLine) {
      e.preventDefault();
      window.alert("メール・LINEのいずれかの配信方法を選択してください。");
      return;
    }
    const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
    const lines = [
      `【配信対象】${audienceLabel} ${stat.total}名`,
      `【配信方法】${channelLabel} (メール ${emailCount}件 / LINE ${lineCount}件)`,
      `【タイトル】${title || "(未入力)"}`,
    ];
    if (stat.none > 0) lines.push(`※ ${stat.none}名はメール・LINEのいずれも未登録のため届きません。`);
    if (reachable === 0) lines.push("※ 現在この対象に送信できる宛先はありません (お知らせの掲載のみ行われます)。");
    lines.push("", "配信後の取り消しはできません。よろしいですか?");
    if (!window.confirm(lines.join("\n"))) e.preventDefault();
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <Field label="配信対象" required>
        <select
          name="audience"
          required
          className={inputCls}
          value={audience}
          onChange={(e) => setAudience(e.target.value as AudienceType)}
        >
          {AUDIENCE_ORDER.map((k) => (
            <option key={k} value={k}>
              {AUDIENCE_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      <div className="border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-xs font-semibold text-gray-500">宛先プレビュー</p>
        <p className="mt-1 text-sm font-semibold text-gray-800">
          配信対象: {audienceLabel} {stat.total}名
          <span className="ml-1 font-normal text-gray-600">
            (メール {sendEmail ? `${stat.email}` : "送信しない"} / LINE {sendLine ? `${stat.line}` : "送信しない"})
          </span>
        </p>
        {AUDIENCE_NOTES[audience] && (
          <p className="mt-0.5 text-xs text-gray-500">{AUDIENCE_NOTES[audience]}</p>
        )}
        {stat.none > 0 && (
          <p className="mt-1 text-xs font-semibold text-amber-700">
            ※ {stat.none}名はメール・LINEのいずれも未登録のため届きません
          </p>
        )}
        {reachable === 0 && (
          <p className="mt-1 text-xs font-semibold text-red-600">
            ※ 送信できる宛先がありません (お知らせの掲載のみ行われます)
          </p>
        )}
      </div>

      <Field label="タイトル" required>
        <input name="title" required className={inputCls} placeholder="例: 体育祭のご案内" />
      </Field>
      <Field label="本文" required>
        <textarea name="body" required rows={6} className={inputCls} placeholder="お知らせの本文を入力してください" />
      </Field>
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="send_email"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="accent-brand-600"
          />
         メールで送信
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="send_line"
            checked={sendLine}
            onChange={(e) => setSendLine(e.target.checked)}
            className="accent-brand-600"
          />
         LINEで送信
        </label>
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p>
            ✓ {state.audienceLabel ?? "宛先"} {state.targetCount ?? 0}名のうち {state.count ?? 0}件へ配信処理を実行しました
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
        {pending ? "送信中…" : "配信する"}
      </button>
    </form>
  );
}
