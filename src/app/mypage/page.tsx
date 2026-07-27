import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { PROGRESS_STEPS, statusIndex, AI_JUDGEMENT_LABELS, AI_JUDGEMENT_MESSAGES } from "@/lib/constants";
import { Card, PageHeader, Badge, btnPrimary, btnSecondary, type BadgeTone } from "@/components/ui";
import type { AiJudgement, LeadStatus } from "@/lib/types";

const JUDGEMENT_TONE: Record<AiJudgement, BadgeTone> = {
  approved: "green",
  caution: "amber",
  rejected: "purple",
};

const VIDEO_TITLE = "学院紹介動画";

/** 資料請求後すぐにご利用いただける3つのメニュー */
const WELCOME_MENU = [
  {
    key: "video",
    title: "学院紹介動画",
    description: "学院の雰囲気・寮生活・実習の様子をご覧いただけます(約5分)",
    href: "/mypage/video",
    button: "動画を見る",
  },
  {
    key: "survey",
    title: "入学仮審査(お試し)フォーム",
    description: "簡単なアンケートに回答いただくと、AIがあなたに合ったサポートをご提案します",
    href: "/mypage/survey",
    button: "アンケートに回答する",
  },
  {
    key: "events",
    title: "学校見学お申し込みフォーム",
    description: "オープンキャンパス・個別見学のご予約をお申し込みいただけます",
    href: "/mypage/events",
    button: "見学に申し込む",
  },
] as const;

/** ステータスごとの「次にやること」定義 */
const NEXT_ACTIONS: Record<LeadStatus, { title: string; description: string; href: string; button: string }> = {
  material_requested: {
    title: "資料をお送りする準備をしています",
    description: "パンフレットの発送準備中です。お待ちいただく間に、学院紹介動画をご覧いただけます。",
    href: "/mypage/video",
    button: "学院紹介動画を見る",
  },
  material_sent: {
    title: "資料を発送しました",
    description: "パンフレットと合わせて、学院紹介動画をご覧ください。学院の雰囲気がよく分かります。",
    href: "/mypage/video",
    button: "学院紹介動画を見る",
  },
  video_watched: {
    title: "動画のご視聴ありがとうございました",
    description: "次は入学仮審査アンケートにご回答ください。あなたに合ったサポートをご提案するための大切なステップです。",
    href: "/mypage/survey",
    button: "仮審査アンケートに回答する",
  },
  survey_answered: {
    title: "アンケートを受け付けました",
    description: "AIによる判定を行っています。判定後、学校見学・オープンキャンパスの予約にお進みいただけます。",
    href: "/mypage/events",
    button: "見学・オープンキャンパスを見る",
  },
  ai_judged: {
    title: "仮審査が完了しました",
    description: "学校見学・オープンキャンパスのご予約が可能になりました。実際に馬と触れ合い、学院の生活を体験してください。",
    href: "/mypage/events",
    button: "見学・オープンキャンパスを予約する",
  },
  visit_reserved: {
    title: "見学のご予約を受け付けました",
    description: "参加費のお支払い状況と当日のご案内は予約ページでご確認いただけます。当日お会いできることを楽しみにしています。",
    href: "/mypage/events",
    button: "予約内容を確認する",
  },
  payment_confirmed: {
    title: "参加費のお支払いを確認しました",
    description: "あとは当日お越しいただくだけです。動きやすい服装でお越しください。ご不明点はお気軽にご連絡ください。",
    href: "/mypage/events",
    button: "予約内容を確認する",
  },
  visit_attended: {
    title: "体験へのご参加ありがとうございました",
    description: "体験の感想をぜひお聞かせください。ご本人用と保護者用の2つのアンケートがあります。",
    href: "/mypage/experience",
    button: "体験アンケートに回答する",
  },
  exp_survey_answered: {
    title: "アンケートのご回答ありがとうございました",
    description: "入学をご希望の方は出願手続きにお進みください。提出書類のチェックと作文の提出ができます。",
    href: "/mypage/application",
    button: "出願する",
  },
  applied: {
    title: "出願を受け付けました",
    description: "続いて性格・適性検査(100問)を受検してください。あなたの強みと向いている仕事が分かります。",
    href: "/mypage/aptitude",
    button: "適性検査を受ける",
  },
  aptitude_done: {
    title: "適性検査の受検が完了しました",
    description: "面接日程のご案内をお待ちください。面接日は出願ページでご確認いただけます。",
    href: "/mypage/application",
    button: "出願内容・面接日を確認する",
  },
  interview: {
    title: "面接お疲れさまでした",
    description: "選考結果の通知をお待ちください。結果は合否確認ページでご覧いただけます。",
    href: "/mypage/result",
    button: "合否を確認する",
  },
  decision_sent: {
    title: "選考結果が届いています",
    description: "合否確認ページで結果をご確認ください。",
    href: "/mypage/result",
    button: "合否を確認する",
  },
  enrollment_procedure: {
    title: "入学手続きを進めましょう",
    description: "提出物の確認、制服サイズの登録、入学規約への同意、各種お支払いを入学手続きページで行えます。",
    href: "/mypage/enrollment",
    button: "入学手続きへ進む",
  },
  admission_fee_paid: {
    title: "入学金の入金を確認しました",
    description: "残りの手続き(制服・教材のお支払い等)を入学手続きページでご確認ください。",
    href: "/mypage/enrollment",
    button: "入学手続きを確認する",
  },
  uniform_ordered: {
    title: "制服の注文を受け付けました",
    description: "入寮準備のご案内をお待ちください。手続き状況は入学手続きページでご確認いただけます。",
    href: "/mypage/enrollment",
    button: "入学手続きを確認する",
  },
  dorm_ready: {
    title: "入寮準備が整いました",
    description: "入学式のご案内は入学者専用ページのお知らせをご覧ください。お会いできる日を楽しみにしています。",
    href: "/mypage/enrollee",
    button: "入学者専用ページへ",
  },
  enrolled: {
    title: "ご入学おめでとうございます🌸",
    description: "入学者専用ページで学院からのお知らせをご確認ください。",
    href: "/mypage/enrollee",
    button: "入学者専用ページへ",
  },
};

export default async function MypageHome() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="マイページ" description="入学までの進捗を確認できます" />
        <Card>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">
              まずは資料請求フォームからお申し込みください。担当者がアカウントとの紐づけを行います。
            </p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const next = NEXT_ACTIONS[lead.status];
  const idx = statusIndex(lead.status);

  const db = adminDb();
  const [{ data: videoData }, { data: surveyData }, { data: bookingsData }] = await Promise.all([
    db.from("video_progress").select("status").eq("lead_id", lead.id).eq("video_title", VIDEO_TITLE).maybeSingle(),
    db.from("pre_screening_surveys").select("id").eq("lead_id", lead.id).maybeSingle(),
    db.from("open_campus_bookings").select("id").eq("lead_id", lead.id).limit(1),
  ]);
  const menuDone: Record<(typeof WELCOME_MENU)[number]["key"], boolean> = {
    video: (videoData as { status?: string } | null)?.status === "completed",
    survey: !!surveyData,
    events: (bookingsData?.length ?? 0) > 0,
  };

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/banner-trust.jpg"
        alt="馬に委ねること。"
        className="mb-6 h-36 w-full rounded-xl object-cover sm:h-48"
      />
      <PageHeader
        title={`こんにちは、${lead.name}さん`}
        description="入学までの進捗と次のステップをご案内します"
      />

      <Card title="ご利用いただける3つのメニュー" className="mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          {WELCOME_MENU.map((item) => (
            <div key={item.key} className="flex flex-col border border-gray-200 p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug text-gray-800">{item.title}</h3>
                {menuDone[item.key] && <Badge tone="green">完了</Badge>}
              </div>
              <p className="mb-3 flex-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
              <Link href={item.href} className={`${menuDone[item.key] ? btnSecondary : btnPrimary} w-full`}>
                {item.button}
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-6 border border-brand-200 bg-brand-50/50 p-6 shadow-sm">
        <p className="text-xs font-bold text-brand-600">
          現在のステップ: {(lead.status === "enrolled" ? PROGRESS_STEPS[idx] : PROGRESS_STEPS[idx + 1])?.label}
        </p>
        <h2 className="mt-1 text-lg font-bold text-gray-900">{next.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{next.description}</p>
        <Link href={next.href} className={`${btnPrimary} mt-4`}>
          {next.button} →
        </Link>
      </div>

      {lead.ai_judgement && (
        <div className="border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
          <p className="text-xs font-bold text-purple-600">入学仮審査結果</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={JUDGEMENT_TONE[lead.ai_judgement]}>{AI_JUDGEMENT_LABELS[lead.ai_judgement]}</Badge>
            {lead.ai_type && <span className="text-sm font-bold text-gray-700">{lead.ai_type}</span>}
          </div>
          <p className="mt-2 text-base font-bold text-gray-900">{AI_JUDGEMENT_MESSAGES[lead.ai_judgement]}</p>
          <p className="mt-2 text-xs text-gray-400">仮審査アンケートの回答から診断しました</p>
        </div>
      )}
    </div>
  );
}
