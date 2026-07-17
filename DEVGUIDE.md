# 開発ガイド (社内向け) — 東関東馬事学院 統合管理システム

Next.js 15 (App Router, src/ dir, TypeScript strict) + Supabase + Tailwind CSS v4。UIは全て日本語。

## 絶対ルール
- **共有ファイルを変更しない**: `src/lib/**`, `src/components/**`, `src/app/layout.tsx`, `globals.css`, `src/middleware.ts`, 各セクションの `layout.tsx` は完成済み。追加ヘルパーが必要なら自分のモジュール内にローカル定義する。
- ページはデフォルトでサーバーコンポーネント。フォームはクライアントコンポーネント(`"use client"` + `useActionState`) + サーバーアクション(`actions.ts` に `"use server"`)。
- データアクセスはサーバー側で `adminDb()`(サービスロール、RLSバイパス)を使う。**サーバーアクションでは必ず最初に権限チェック**: 管理画面は `await requireRole("admin")`、ポータルは `await requireRole("applicant")` 等 + 自分のデータであることの検証(lead.user_id / student.user_id 照合)。
- ミューテーション後は `revalidatePath(...)` を呼ぶ。
- `next/link` の `Link` を使う。`<a>` は外部リンクのみ。
- TypeScript は strict。`any` を使わず `src/lib/types.ts` の型を使う。Supabase の結果は `as Lead` 等でキャストしてよい。
- 動的ルートは Next.js 15 なので `params` は Promise: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params;`
- `searchParams` も Promise: `const sp = await searchParams;`

## 主要インポート
```ts
import { adminDb } from "@/lib/supabase/admin";        // サービスロールDB (server only)
import { requireRole, getSessionProfile } from "@/lib/auth";
import { getLeadForUser, getStudentForUser, getStudentsForParent, advanceLeadStatus } from "@/lib/data";
import { sendNotification, notifyBoth } from "@/lib/notify";
import { analyzePreScreening, computeEnrollmentProbability, analyzeAptitude, summarizeHorseMonth } from "@/lib/ai";
import { APTITUDE_QUESTIONS, LIKERT_OPTIONS } from "@/lib/aptitude";
import { fmtDate, fmtDateTime, fmtYen, toDateInput, daysAgo } from "@/lib/format";
import {
  PROGRESS_STEPS, LEAD_STATUS_LABELS, statusIndex, VIDEO_STATUS_LABELS, AI_JUDGEMENT_LABELS, AI_JUDGEMENT_MESSAGES,
  BOOKING_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TYPE_LABELS, BANK_TRANSFER_INFO,
  APPLICATION_STATUS_LABELS, ADMISSION_RESULT_LABELS, PROCEDURE_STATUS_LABELS, APPROVAL_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS, MEAL_LABELS, AUDIENCE_LABELS, PRE_SCREENING_QUESTIONS,
  POST_VISIT_QUESTIONS, APPLICATION_DOCUMENTS, DECISION_DOCUMENTS, EXPERIENCE_APPLICATION_URLS,
  APTITUDE_TRAITS, SUITABILITY_LABELS, FOLLOW_UP_RULES, UNIFORM_SIZES, BOOTS_SIZES, HELMET_SIZES,
  GRADES, COURSES, INTERESTED_JOBS, REFERRAL_SOURCES, DEFAULT_STUDENT_SURVEY_QUESTIONS,
} from "@/lib/constants";
import {
  Card, PageHeader, StatCard, EmptyState, Badge, LeadStatusBadge, ProgressTracker,
  Label, Field, inputCls, btnPrimary, btnSecondary, btnDanger, btnSmall,
  Table, Td, BackLink, InfoRow, SectionTitle,
} from "@/components/ui";
import type { Lead, Student, Horse, ... } from "@/lib/types";
```

## UIパターン
- 一覧: `<PageHeader title=... />` + `<Table headers={[...]}>` + 行は `<tr className="hover:bg-gray-50">` + `<Td>`。
- 詳細: `<BackLink>` + `<Card title=...>` + `<InfoRow>` の `<dl>`。
- 統計: `<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">` + `<StatCard>`。
- フォーム送信ボタン: `className={btnPrimary}`、pending中は「送信中…」。
- 成功メッセージ: `<p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ ...</p>`
- エラー: `bg-red-50 text-red-600`。
- バッジ色: LeadStatusBadge がある。その他は `<Badge tone="green|blue|amber|red|purple|gray|brand">`。

## サーバーアクションのパターン
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

export interface ActionState { ok?: boolean; error?: string; }

export async function doSomething(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const { error } = await adminDb().from("...").update({ ... }).eq("id", id);
  if (error) return { error: "保存に失敗しました" };
  revalidatePath("/admin/...");
  return { ok: true };
}
```
クライアント側:
```tsx
"use client";
import { useActionState } from "react";
const [state, formAction, pending] = useActionState<ActionState, FormData>(doSomething, {});
```
シンプルな1ボタン操作(確認不要のトグル等)は `<form action={serverAction}>` + hidden input でも良い(その場合アクションは `(formData: FormData) => Promise<void>` 形式)。

## DBテーブル (全カラムは src/lib/types.ts 参照)
profiles, horses, leads, video_progress, pre_screening_surveys, open_campus_events,
open_campus_bookings, experience_surveys, applications, aptitude_tests, admission_decisions,
enrollment_procedures, payments, announcements, students, attendance_records, training_records,
riding_reports, overnight_leave_requests, meal_records, bulk_messages, notifications,
student_surveys, student_survey_responses, horse_monthly_summaries, supporters, follow_up_logs

## 進捗ステータス (leads.status, 18段階)
material_requested → material_sent → video_watched → survey_answered → ai_judged → visit_reserved
→ payment_confirmed → visit_attended → exp_survey_answered → applied → aptitude_done → interview
→ decision_sent → enrollment_procedure → admission_fee_paid → uniform_ordered → dorm_ready → enrolled
ステータス更新は `advanceLeadStatus(leadId, "...")` を使う(前進のみ)。

## フォロー対象の自動抽出ルール
1. video_no_survey: video_progress.status='completed' かつ pre_screening_surveys なし
2. survey_no_booking: pre_screening_surveys あり かつ open_campus_bookings なし
3. attended_no_application: bookings.status='attended' かつ applications なし かつ 体験から14日以上経過

## 通知
メール/LINE送信は `notifyBoth(email, lineId, title, body, relatedType, {email: bool, line: bool})` または単発は `sendNotification({...})`。
`RESEND_API_KEY` / `LINE_CHANNEL_ACCESS_TOKEN` が設定されていれば実配信、未設定ならログ記録のみ(`src/lib/notify.ts`)。どちらの場合も notifications テーブルへ必ずログが残り、管理画面の「送信ログ」で確認できる。

## 決済
オンラインカード決済は `src/lib/stripe.ts` の `createCheckoutSession()` で Stripe Checkout Session を作成し `redirect()`。
`STRIPE_SECRET_KEY` 未設定時は `stripeEnabled()` が false を返すので、呼び出し側で「準備中」表示にフォールバックすること(即時成功として扱ってはいけない)。
決済確定(pending/paid → confirmed)は `src/lib/data.ts` の `markPaymentConfirmed(paymentId, confirmedBy?)` に一本化されており、Webhook (`src/app/api/stripe/webhook/route.ts`) と管理画面の手動確認ボタン (`admin/payments`) の両方から呼ばれる。新しい決済発生箇所を追加する場合もこの関数を再利用すること。
銀行振込先の表示文言は `constants.ts` の `BANK_TRANSFER_INFO` 一箇所のみを参照する(重複定義しない)。

## アンケート設問
`SurveyQuestion.type` は `text | textarea | choice | checkbox | stars` の5種類。`checkbox`(複数選択)はフォーム側で `formData.getAll(id)` を「、」区切りで1つの文字列として保存する(DBスキーマ変更を避けるため)。`stars` は 1〜5 の数値文字列として保存する。新しい設問セットを追加する場合もこのパターンに従うこと。
