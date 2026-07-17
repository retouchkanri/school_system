"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRequestAction, type RequestState } from "./actions";
import SiteLogo from "@/components/site-logo";
import { btnPrimary, inputCls, Label } from "@/components/ui";
import { GRADES, COURSES, INTERESTED_JOBS, REFERRAL_SOURCES } from "@/lib/constants";

export default function RequestPage() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(submitRequestAction, {});

  if (state.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
          <SiteLogo className="mx-auto inline-block" />
          <h1 className="mt-4 text-lg font-bold text-gray-900">資料請求を受け付けました</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            ご入力いただいたメールアドレスへ受付確認をお送りしました。マイページのご案内も記載しておりますので、ご確認ください。
          </p>
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
            マイページには「メールアドレス」と「生年月日(半角数字8桁 例:20250102)」でログインできます。
            パスワードはログイン後にいつでも変更いただけます。
          </p>
          <Link href="/login" className={`${btnPrimary} mt-6`}>
            マイページへログイン
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner-talk.jpg"
          alt="馬と話すこと。"
          className="mb-6 h-36 w-full rounded-xl object-cover shadow-sm sm:h-44"
        />
        <div className="mb-6 text-center">
          <SiteLogo className="mx-auto inline-block" />
          <h1 className="mt-3 text-xl font-bold text-gray-900">資料請求フォーム</h1>
          <p className="mt-1 text-sm text-gray-500">
            東関東馬事高等学院・東関東馬事専門学院のパンフレットを無料でお送りします
          </p>
        </div>

        <form action={formAction} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>氏名</Label>
              <input name="name" required className={inputCls} placeholder="山田 太郎" />
            </div>
            <div>
              <Label>フリガナ</Label>
              <input name="kana" className={inputCls} placeholder="ヤマダ タロウ" />
            </div>
            <div>
              <Label>学年</Label>
              <select name="grade" className={inputCls} defaultValue="">
                <option value="">選択してください</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label required>生年月日</Label>
              <input name="birth_date" type="date" required className={inputCls} />
              <p className="mt-1 text-[11px] text-gray-400">マイページの初回ログインパスワードとして使用します</p>
            </div>
            <div>
              <Label>性別</Label>
              <select name="gender" className={inputCls} defaultValue="">
                <option value="">選択してください</option>
                <option>男性</option>
                <option>女性</option>
                <option>回答しない</option>
              </select>
            </div>
            <div>
              <Label>学校名</Label>
              <input name="school_name" className={inputCls} placeholder="○○中学校" />
            </div>
            <div>
              <Label>保護者氏名</Label>
              <input name="guardian_name" className={inputCls} placeholder="山田 花子" />
            </div>
            <div>
              <Label>郵便番号</Label>
              <input name="postal_code" className={inputCls} placeholder="283-0000" />
            </div>
            <div className="sm:col-span-2">
              <Label>住所</Label>
              <input name="address" className={inputCls} placeholder="千葉県東金市…" />
            </div>
            <div>
              <Label>電話番号</Label>
              <input name="phone" className={inputCls} placeholder="090-0000-0000" />
            </div>
            <div>
              <Label required>メールアドレス</Label>
              <input name="email" type="email" required className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <Label>LINE ID</Label>
              <input name="line_id" className={inputCls} placeholder="LINE連携をご希望の方" />
            </div>
            <div>
              <Label>希望学科</Label>
              <select name="desired_course" className={inputCls} defaultValue="">
                <option value="">選択してください</option>
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>興味のある仕事(複数選択可)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {INTERESTED_JOBS.map((job) => (
                <label
                  key={job}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50"
                >
                  <input type="checkbox" name="interested_jobs" value={job} className="accent-brand-600" />
                  {job}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>馬経験の有無</Label>
              <select name="horse_experience" className={inputCls} defaultValue="no">
                <option value="no">なし</option>
                <option value="yes">あり</option>
              </select>
            </div>
            <div>
              <Label>経験の内容(あれば)</Label>
              <input name="horse_experience_detail" className={inputCls} placeholder="乗馬クラブに1年 など" />
            </div>
            <div className="sm:col-span-2">
              <Label>何を見て知りましたか</Label>
              <select name="referral_source" className={inputCls} defaultValue="">
                <option value="">選択してください</option>
                {REFERRAL_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

          <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
            {pending ? "送信中…" : "資料請求する(無料)"}
          </button>
          <p className="text-center text-xs text-gray-400">
            送信いただいた情報は入学案内の目的にのみ使用します
          </p>
        </form>
      </div>
    </div>
  );
}
