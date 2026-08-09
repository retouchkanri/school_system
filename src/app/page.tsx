import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartHandshake,
  Moon,
  Phone,
  PlayCircle,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";
import SiteHeader from "@/components/site-header";
import HomeHero, { type Slide } from "@/components/home/home-hero";
import Reveal from "@/components/home/reveal";
import Counter from "@/components/home/counter";
import PhotoMarquee from "@/components/home/photo-marquee";
import AdminStepsAccordion, { type AdminStepGroup } from "@/components/home/admin-steps-accordion";
import { KOUTOU_IMAGES, KOUTOU_DETAIL, KOUTOU_FUTURE, SENMON_IMAGES, OFFICIAL_SITES } from "@/lib/site-images";

/* ============ セクションデータ ============ */

const HERO_SLIDES: Slide[] = [
  {
    src: KOUTOU_IMAGES.campus1.src,
    alt: KOUTOU_IMAGES.campus1.alt,
    label: "馬と生きる、未来をつくる。",
    catch: "馬と生きる、\n未来をつくる。",
    desc: "東関東馬事高等学院・東関東馬事専門学院。資料請求から入学、そして毎日の学院生活まで――ふたつの学院を、ひとつのプラットフォームで。",
  },
  {
    src: KOUTOU_IMAGES.riding1.src,
    alt: KOUTOU_IMAGES.riding1.alt,
    label: "ほぼ毎日、馬に乗れる学校生活。",
    catch: "ほぼ毎日、\n馬に乗れる学校生活。",
    desc: "初心者からでも大丈夫。基礎から一つひとつ、確かな騎乗技術を身につけていきます。",
  },
  {
    src: KOUTOU_IMAGES.campus3.src,
    alt: KOUTOU_IMAGES.campus3.alt,
    label: "馬とともに、365日を過ごす。",
    catch: "馬とともに、\n365日を過ごす。",
    desc: "全寮制だからこそ生まれる、馬と仲間との絆。学院生活のすべてがここにあります。",
  },
  {
    src: KOUTOU_IMAGES.horseClose.src,
    alt: KOUTOU_IMAGES.horseClose.alt,
    label: "触れて、知る。馬というパートナー。",
    catch: "触れて、知る。\n馬という、パートナー。",
    desc: "馬の目線に立ち、心を通わせる。プロフェッショナルへの第一歩は、馬との対話から。",
  },
  {
    src: KOUTOU_IMAGES.campus2.src,
    alt: KOUTOU_IMAGES.campus2.alt,
    label: "自然の中で、本物を学ぶ。",
    catch: "自然の中で、\n本物を学ぶ。",
    desc: "千葉県山武市の恵まれた環境で、座学と実践をバランスよく。ふたつの学院が、未来への扉を開きます。",
  },
];

const SCHOOLS = [
  {
    key: "koutou",
    logo: KOUTOU_IMAGES.logo.src,
    photo: KOUTOU_DETAIL.tokucho1.src,
    name: "東関東馬事高等学院",
    en: "HIGASHIKANTO BAJI HIGH SCHOOL",
    tagline: "勉強は最低限！夢は最大限！",
    desc: "千葉県山武市の小学校跡地をリノベーションした広大なキャンパスで、朝から晩まで馬と過ごせる高校。ほぼ毎日騎乗授業があり、乗馬ライセンスや騎乗者資格も高校授業として取得できます。",
    chips: ["一般高校乗馬コース", "騎手受験特別コース", "競走馬厩務員コース", "全寮制"],
    url: OFFICIAL_SITES.koutou.url,
  },
  {
    key: "senmon",
    logo: SENMON_IMAGES.logo.src,
    photo: SENMON_IMAGES.kankyoMain.src,
    name: "東関東馬事専門学院",
    en: "HIGASHIKANTO BAJI COLLEGE",
    tagline: "未経験からJRA厩務員へ。業界一体型の信頼と実績",
    desc: "関東と関西の4つの教育施設で約120頭の馬を学生が管理。未経験から最短1年4ヶ月でJRA競馬学校厩務員課程合格を目指せる、実践型カリキュラムの専門学院です。",
    chips: ["JRA厩務員課程", "10年連続合格実績", "報酬型の業界実習", "学生寮完備"],
    url: OFFICIAL_SITES.senmon.url,
  },
];

const SCHOOL_STATS = [
  { value: 118, suffix: "頭", label: "本校で管理する馬匹の数" },
  { value: 8, suffix: "施設", label: "本校の職場実習連携施設" },
  { value: 72, suffix: "名", label: "ＪＲＡ厩務員の合格者数", note: "※平成２８年度以降" },
  { value: 73, suffix: "％", label: "未経験・初心者の入学率", note: "※令和3年以降実績" },
];

const PILLARS = [
  {
    icon: Send,
    title: "入学管理 (CRM・MA)",
    desc: "資料請求から出願・合否・入学手続きまで、見込み生徒との出会いを18ステップで一元管理。対応漏れを自動フォローで防ぎます。",
  },
  {
    icon: GraduationCap,
    title: "在校生・保護者管理",
    desc: "出欠・騎乗報告・研修・外泊・食事・成績まで学院生活のすべてを記録。生徒と保護者それぞれの専用ポータルでいつでも確認できます。",
  },
  {
    icon: Sparkles,
    title: "AI分析・支援者連携",
    desc: "アンケートや適性検査をAIが分析し、生徒一人ひとりのタイプと可能性を可視化。リタッチ馬の近況はAIが要約し一口支援者へ届けます。",
  },
];

const ADMISSION_STEPS = [
  {
    step: "STEP 1",
    icon: FileText,
    title: "資料請求",
    img: KOUTOU_DETAIL.tokucho1.src,
    desc: "フォームから約1分で入力完了。氏名・学年・希望学科・馬経験などを登録すると、学院パンフレットをお届けします。担当者・発送状況もシステムで管理。",
    tags: ["入力1分", "リード管理", "LINE登録"],
    href: "/request",
    linkLabel: "資料請求フォーム",
  },
  {
    step: "STEP 2",
    icon: PlayCircle,
    title: "AI事前審査",
    img: KOUTOU_DETAIL.tokucho3.src,
    desc: "学院紹介動画の視聴状況(未視聴・途中・完了)を自動管理。入学仮審査アンケートの回答をAIが読み取り「この生徒は○○タイプ」と自動でまとめ、担当者は読むだけ。",
    tags: ["動画視聴管理", "仮審査アンケート", "AIタイプ判定"],
    href: "/mypage/video",
    linkLabel: "動画・アンケートへ",
  },
  {
    step: "STEP 3",
    icon: CalendarDays,
    title: "学校見学・オープンキャンパス",
    img: SENMON_IMAGES.taikenRiding.src,
    desc: "AI判定で参加可能となったら案内を自動送信。日程予約から参加費8,000円の決済(クレジットカード・銀行振込)までオンラインで完結します。",
    tags: ["オンライン予約", "カード決済", "銀行振込"],
    href: "/mypage/events",
    linkLabel: "見学予約へ",
  },
  {
    step: "STEP 4",
    icon: ClipboardList,
    title: "体験終了アンケート",
    img: SENMON_IMAGES.taikenCare.src,
    desc: "体験後は本人と保護者の両方が回答。「馬は好きになった」「寮生活できそう」「学費への不安」などの声をAIが分析し、入学確率を予測して表示します。",
    tags: ["本人・保護者回答", "AI分析", "入学確率予測"],
    href: "/mypage/experience",
    linkLabel: "体験アンケートへ",
  },
  {
    step: "STEP 5",
    icon: UserCheck,
    title: "出願・適性検査",
    img: KOUTOU_DETAIL.tokucho4.src,
    desc: "願書・写真・成績・作文の提出に加え、約100問の性格・適性検査を実施。リーダー性・ストレス耐性・動物適性から騎手向き・厩務員向きまでAIレポートが完成します。",
    tags: ["Web出願", "適性検査100問", "AIレポート"],
    href: "/mypage/application",
    linkLabel: "出願ページへ",
  },
  {
    step: "STEP 6",
    icon: CheckCircle2,
    title: "合否通知",
    img: KOUTOU_IMAGES.competition.src,
    desc: "メール・LINE・郵送で自動送信。合否結果とあわせて学費・入学規約・学用品一覧・制服案内・入学までの流れをまとめてお届けします。",
    tags: ["メール", "LINE", "郵送"],
    href: "/mypage/result",
    linkLabel: "合否確認へ",
  },
  {
    step: "STEP 7",
    icon: CreditCard,
    title: "入学手続き",
    img: KOUTOU_DETAIL.shisetsuDorm.src,
    desc: "専用ページで顔写真・保険証・制服やブーツのサイズ・緊急連絡先・アレルギーなどを入力。規約同意は電子署名、入学金・制服代・教材費の支払いもオンラインで完結。",
    tags: ["電子署名", "オンライン決済", "サイズ登録"],
    href: "/mypage/enrollment",
    linkLabel: "入学手続きへ",
  },
  {
    step: "STEP 8",
    icon: Users,
    title: "入学者専用ページ",
    img: KOUTOU_DETAIL.tokucho7.src,
    desc: "入学決定者だけが見られる特設ページ。入学式の案内・持ち物・寮案内・配属馬房・担当馬・クラス発表・時間割・制服の発送状況までLINE通知とあわせてお知らせします。",
    tags: ["担当馬発表", "クラス発表", "LINE通知"],
    href: "/mypage/enrollee",
    linkLabel: "入学者ページへ",
  },
];

const AI_FEATURES = [
  {
    icon: Brain,
    title: "AIタイプ判定",
    desc: "仮審査アンケートの回答から「明るく素直。動物への興味が非常に強い。初期サポート推奨」など生徒像を自動で要約し、顧客情報へ登録します。",
  },
  {
    icon: TrendingUp,
    title: "入学確率予測",
    desc: "体験後の本人・保護者アンケートをAIが分析し、入学確率を%で表示。優先的にフォローすべき生徒がひと目で分かります。",
  },
  {
    icon: ClipboardList,
    title: "性格・適性検査分析",
    desc: "約100問の検査から、コツコツ型・リーダー型などの性格に加え、騎手・厩務員・牧場・インストラクターへの適性をレポート化します。",
  },
  {
    icon: HeartHandshake,
    title: "騎乗報告のAI要約",
    desc: "毎日の騎乗報告からリタッチ馬の情報を自動抽出。今月のその馬の様子をAIが読みやすくまとめ、一口支援者と共有します。",
  },
];

const STUDENT_FEATURES = [
  { icon: CheckCircle2, title: "出欠管理", desc: "日常の出欠・遅刻・早退をワンタップで記録" },
  { icon: ClipboardList, title: "授業日報・騎乗報告", desc: "騎乗の内容と馬の状態を毎日記録" },
  { icon: Building2, title: "研修管理", desc: "牧場・乗馬クラブでの研修先と履歴を管理" },
  { icon: Moon, title: "外泊届の保護者承認", desc: "申請から保護者のオンライン承認まで完結" },
  { icon: Utensils, title: "食事管理", desc: "食べた・食べないを記録し健康を見守る" },
  { icon: GraduationCap, title: "成績・単位管理", desc: "学習成果と資格取得状況をいつでも確認" },
  { icon: Bell, title: "一斉配信 (メール・LINE)", desc: "生徒・保護者へのお知らせをまとめて送信" },
  { icon: FileText, title: "定期アンケート", desc: "在校生の声を定期的に収集し指導へ反映" },
];

const PORTALS = [
  { icon: FileText, name: "資料請求", href: "/request", desc: "はじめての方はこちら。約1分で完了", tone: "bg-brand-50 text-brand-700" },
  { icon: UserCheck, name: "入学希望者マイページ", href: "/mypage", desc: "動画視聴〜入学手続きまでの専用ページ", tone: "bg-brand-50 text-brand-700" },
  { icon: GraduationCap, name: "在校生ポータル", href: "/student", desc: "出欠・騎乗報告・研修・食事の記録", tone: "bg-emerald-50 text-emerald-700" },
  { icon: ShieldCheck, name: "保護者ポータル", href: "/parent", desc: "お子様の学院生活を見守り、外泊を承認", tone: "bg-blue-50 text-blue-700" },
  { icon: HeartHandshake, name: "一口支援者ポータル", href: "/supporter", desc: "リタッチ馬の毎月のAI要約レポート", tone: "bg-amber-50 text-amber-700" },
  { icon: Building2, name: "職員ダッシュボード", href: "/admin", desc: "全生徒の進捗と学院運営を一元管理", tone: "bg-purple-50 text-purple-700" },
];

const ADMIN_STEP_GROUPS: AdminStepGroup[] = [
  { title: "資料請求・準備", steps: ["資料請求", "資料発送", "動画視聴"] },
  { title: "仮審査・見学", steps: ["仮審査回答", "AI判定", "見学予約", "入金確認", "体験参加"] },
  { title: "出願・選考", steps: ["アンケート", "出願", "性格診断", "面接"] },
  { title: "合否・入学手続き", steps: ["合否通知", "入学手続き", "入学金確認"] },
  { title: "入学準備", steps: ["制服注文", "入寮準備", "入学式"] },
];

const FOLLOW_UPS = [
  "動画は見たが、アンケート未回答の方",
  "アンケート回答済みだが、見学予約がない方",
  "見学参加後14日経過したが、出願がない方",
];

const FUTURE_MARQUEE = KOUTOU_FUTURE.map((f) => ({ src: f.src, alt: f.alt, caption: f.alt }));

/* ============ ページ本体 ============ */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* ヒーロー */}
        <HomeHero slides={HERO_SLIDES} />

        {/* コンセプト */}
        <section className="px-[6vw] py-20 text-center sm:py-24">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.35em] text-accent-600">INTEGRATED PLATFORM</p>
            <h2 className="heading-underline mt-4 text-2xl font-bold leading-relaxed text-gray-900 sm:text-3xl">
              出会いから、卒業まで。
              <br />
              すべてを、ひとつのシステムで。
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-3xl text-sm leading-loose text-gray-600 sm:text-base">
              騎手、厩務員、乗馬インストラクター――馬のプロフェッショナルを目指す一人ひとりのために。
              資料請求から AI 事前審査、オープンキャンパス、出願、入学手続き、そして毎日の学院生活と一口支援者への報告まで。
              CRM・マーケティングオートメーション・入試管理・在校生管理を統合した、馬事学院独自のプラットフォームです。
            </p>
          </Reveal>
        </section>

        {/* ふたつの学院 */}
        <section className="bg-brand-50/60 px-[6vw] py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">OUR SCHOOLS</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">ふたつの学院</h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-6xl gap-8 lg:grid-cols-2">
            {SCHOOLS.map((school, i) => (
              <Reveal key={school.key} variant={i === 0 ? "right" : "left"} delay={i * 150}>
                <div className="group h-full overflow-hidden border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
                  <div className="img-zoom relative h-56 sm:h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={school.photo} alt={school.name} className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <p className="text-[10px] font-bold tracking-[0.25em] text-white/80">{school.en}</p>
                      <h3 className="mt-1 text-xl font-bold text-white drop-shadow">{school.name}</h3>
                    </div>
                  </div>
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center justify-between gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={school.logo} alt={`${school.name} ロゴ`} className="h-9 w-auto object-contain" loading="lazy" />
                      <a
                        href={school.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                      >
                        公式サイト <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <p className="mt-4 font-serif text-base font-bold text-brand-700">{school.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{school.desc}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {school.chips.map((chip) => (
                        <span key={chip} className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 数字で見る学院 */}
        <section className="border-y border-brand-100 bg-brand-50/60 px-[6vw] py-16">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 text-center lg:grid-cols-4">
            {SCHOOL_STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 120}>
                <p className="font-serif text-4xl font-bold text-brand-700 sm:text-5xl">
                  <Counter value={stat.value} />
                  <span className="ml-1 text-xl text-accent-600 sm:text-2xl">{stat.suffix}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-gray-500 sm:text-sm">{stat.label}</p>
                {"note" in stat && stat.note && (
                  <p className="mt-0.5 text-[10px] leading-relaxed text-gray-400 sm:text-xs">{stat.note}</p>
                )}
              </Reveal>
            ))}
          </div>
        </section>

        {/* プラットフォーム3本柱 */}
        <section className="px-[6vw] py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">WHAT WE DO</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              システムができる、3つのこと
            </h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 150} variant="zoom">
                <div className="h-full border border-gray-200 bg-white p-7 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <pillar.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-gray-900">{pillar.title}</h3>
                  <p className="mt-3 text-xs leading-relaxed text-gray-500 sm:text-sm">{pillar.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 入学までの流れ (8ステップ タイムライン) */}
        <section className="bg-brand-50/40 px-[6vw] py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">ADMISSION FLOW</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              資料請求から入学までの8ステップ
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
              すべてのステップがオンラインでつながっているから、迷わない。
              あなたの「今」に合わせて、システムが次の一歩をご案内します。
            </p>
          </Reveal>

          <div className="relative mx-auto mt-14 max-w-5xl">
            {/* 縦のタイムライン線 */}
            <div className="absolute left-5 top-0 hidden h-full w-0.5 bg-brand-200 sm:left-1/2 sm:block sm:-translate-x-1/2" />

            <ol className="space-y-10 sm:space-y-14">
              {ADMISSION_STEPS.map((item, i) => {
                const even = i % 2 === 0;
                return (
                  <li key={item.step} className="relative">
                    {/* タイムライン上のドット */}
                    <span className="absolute left-1/2 top-8 z-10 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-white bg-brand-500 shadow sm:block" />
                    <Reveal variant={even ? "right" : "left"}>
                      <div className={`sm:flex sm:items-center sm:gap-10 ${even ? "" : "sm:flex-row-reverse"}`}>
                        <div className="img-zoom relative hidden h-52 overflow-hidden shadow-md sm:block sm:w-1/2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.img} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/30 to-transparent" />
                        </div>
                        <div className="sm:w-1/2">
                          <div className="border border-gray-200 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:p-7">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                                <item.icon className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-[11px] font-bold tracking-widest text-accent-600">{item.step}</p>
                                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                              </div>
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <Link
                              href={item.href}
                              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:gap-3 hover:text-brand-700"
                            >
                              {item.linkLabel} <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* AI機能 */}
        <section className="px-[6vw] py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">AI POWERED</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              AIが、担当者の目と手になる。
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
              アンケートも適性検査も騎乗報告も、読み込んでまとめるのはAIの仕事。
              職員は「読むだけ」で、一人ひとりに向き合う時間が増えます。
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
            {AI_FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 130}>
                <div className="animate-glow-pulse h-full border border-gray-200 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent-300">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <feature.icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 在校生・保護者管理 */}
        <section className="px-[6vw] py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <Reveal>
                <p className="text-xs font-bold tracking-[0.35em] text-accent-600">SCHOOL LIFE</p>
                <h2 className="mt-3 text-2xl font-bold leading-relaxed text-gray-900 sm:text-3xl">
                  入学してからも、
                  <br />
                  毎日をまるごとサポート。
                </h2>
                <p className="mt-5 text-sm leading-loose text-gray-600">
                  全寮制だからこそ、日々の記録と保護者との連携が大切。
                  出欠から騎乗報告、外泊届の承認、食事の記録まで、学院生活のすべてをメールよりも身近な LINE 連動でつなぎます。
                </p>
              </Reveal>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {STUDENT_FEATURES.map((feature, i) => (
                  <Reveal key={feature.title} delay={i * 80} variant="up">
                    <div className="flex h-full items-start gap-3 border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <feature.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{feature.title}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{feature.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delay={200}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/student"
                    className="inline-flex items-center gap-1.5 bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-300 hover:bg-accent-500"
                  >
                    在校生ポータルへ <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/parent"
                    className="inline-flex items-center gap-1.5 bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-300 hover:bg-accent-500"
                  >
                    保護者ポータルへ <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Reveal variant="left" delay={100}>
                <div className="img-zoom overflow-hidden shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SENMON_IMAGES.dormRoom.src} alt={SENMON_IMAGES.dormRoom.alt} className="h-48 w-full object-cover sm:h-56" loading="lazy" />
                </div>
              </Reveal>
              <Reveal variant="left" delay={250}>
                <div className="img-zoom mt-8 overflow-hidden shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SENMON_IMAGES.dormMeal.src} alt={SENMON_IMAGES.dormMeal.alt} className="h-48 w-full object-cover sm:h-56" loading="lazy" />
                </div>
              </Reveal>
              <Reveal variant="left" delay={400}>
                <div className="img-zoom overflow-hidden shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={KOUTOU_DETAIL.shisetsuShokudo.src} alt={KOUTOU_DETAIL.shisetsuShokudo.alt} className="h-48 w-full object-cover sm:h-56" loading="lazy" />
                </div>
              </Reveal>
              <Reveal variant="left" delay={550}>
                <div className="img-zoom mt-8 overflow-hidden shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={KOUTOU_DETAIL.tokucho2.src} alt={KOUTOU_DETAIL.tokucho2.alt} className="h-48 w-full object-cover sm:h-56" loading="lazy" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* リタッチ馬 × 一口支援者 */}
        <section className="bg-brand-50/50 px-[6vw] py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <Reveal variant="right">
              <div className="img-zoom relative overflow-hidden shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={KOUTOU_IMAGES.horseClose.src} alt="リタッチ馬" className="h-72 w-full object-cover sm:h-96" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <p className="absolute bottom-5 left-6 font-serif text-lg font-bold text-white drop-shadow">
                  引退競走馬に、第二の馬生を。
                </p>
              </div>
            </Reveal>
            <div>
              <Reveal variant="left">
                <p className="text-xs font-bold tracking-[0.35em] text-accent-600">RETOUCH HORSES</p>
                <h2 className="mt-3 text-2xl font-bold leading-relaxed text-gray-900 sm:text-3xl">
                  リタッチ馬の「今月」を、
                  <br />
                  一口支援者のもとへ。
                </h2>
                <p className="mt-5 text-sm leading-loose text-gray-600">
                  学院では引退競走馬(リタッチ馬)を受け入れ、生徒たちが日々ケアと調教を行っています。
                  毎日の騎乗報告からリタッチ馬の情報をシステムが自動でピックアップ。
                  AIがひと月の様子を読みやすく要約し、その馬を支える一口支援者の皆さまへ毎月お届けします。
                </p>
                <ul className="mt-6 space-y-3 text-sm text-gray-700">
                  {["騎乗報告からリタッチ馬の記録を自動抽出", "AIが今月の調子・成長・エピソードを要約", "支援者専用ポータルでいつでも閲覧可能"].map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/supporter"
                  className="mt-7 inline-flex min-h-[48px] min-w-[200px] items-center justify-center gap-1.5 bg-brand-600 px-6 text-sm font-semibold text-white transition duration-300 ease-out hover:bg-accent-500"
                >
                  一口支援者ポータルへ <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 職員ダッシュボード */}
        <section className="px-[6vw] py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">STAFF DASHBOARD</p>
              <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
                対応漏れを、ゼロへ。
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
                生徒ごとの進捗を5つの主要ステップでひと目に把握できる職員用ダッシュボード。
                フォローが必要な生徒はシステムが自動で抽出し、メール・LINEでアプローチできます。
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-12 border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-sm font-bold text-gray-700">入学までの進捗管理 (5ステップ・全18項目)</h3>
                <div className="mt-4">
                  <AdminStepsAccordion groups={ADMIN_STEP_GROUPS} />
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {FOLLOW_UPS.map((follow, i) => (
                    <Reveal key={follow} delay={i * 120}>
                      <div className="flex h-full items-start gap-3 border border-amber-200 bg-amber-50/70 p-4">
                        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">自動抽出</p>
                          <p className="mt-1 text-xs leading-relaxed text-amber-700">{follow}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
                <p className="mt-6 text-center text-xs text-gray-400">
                  抽出された対象者には、メール・LINEでワンクリックフォロー。入学率の向上に直結します。
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6つのポータル */}
        <section className="bg-brand-50/60 px-[6vw] py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">PORTALS</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              あなた専用の入り口
            </h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PORTALS.map((portal, i) => (
              <Reveal key={portal.name} delay={i * 100} variant="zoom">
                <Link
                  href={portal.href}
                  className="group flex h-full flex-col border border-gray-200 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${portal.tone}`}>
                    <portal.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-gray-900">{portal.name}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-gray-500">{portal.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 transition-all group-hover:gap-3">
                    ひらく <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 目指せる進路 (マーキー) */}
        <section className="py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.35em] text-accent-600">FUTURE</p>
            <h2 className="heading-underline mt-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              生徒たちの未来 — 目指せる進路
            </h2>
            <p className="mx-auto mt-6 max-w-2xl px-[6vw] text-center text-sm leading-relaxed text-gray-600">
              JRA騎手・NAR騎手・厩務員から、生産・育成牧場、乗馬クラブ、観光牧場、養老牧場まで。
              性格・適性検査のAI分析が、一人ひとりに合った馬の仕事への道を照らします。
            </p>
          </Reveal>
          <Reveal delay={200} className="mt-10">
            <PhotoMarquee items={FUTURE_MARQUEE} />
          </Reveal>
        </section>

        {/* CTA (パララックス) */}
        {/* 背景写真を残しているのはトップページのこのセクションのみ (他ページは背景画像なし) */}
        <section
          className="relative bg-cover bg-fixed bg-center px-[6vw] py-28 text-center"
          style={{ backgroundImage: `url(${KOUTOU_IMAGES.cover.src})` }}
        >
          <div className="absolute inset-0 bg-brand-900/70" />
          <Reveal className="relative">
            <p className="font-serif text-lg text-brand-100">馬と生きる未来への、最初の一歩。</p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">まずは、資料請求から。</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-brand-100/90">
              約1分の入力で、パンフレット・学院紹介動画・オープンキャンパスのご案内をお届けします。
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/request"
                className="inline-flex min-h-[56px] min-w-[220px] items-center justify-center bg-brand-600 px-10 text-base font-semibold text-white transition duration-300 ease-out hover:bg-accent-500"
              >
                無料で資料請求する
              </Link>
              <a
                href="tel:05068753336"
                className="inline-flex min-h-[56px] min-w-[220px] items-center justify-center gap-2 border border-white bg-transparent px-8 text-sm font-semibold text-white transition duration-300 ease-out hover:bg-white hover:text-brand-800"
              >
                <Phone className="h-4 w-4" /> 050-6875-3336
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-brand-100 bg-brand-50/60 px-[6vw] pb-10 pt-14 text-gray-600">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-serif text-lg font-bold text-gray-900">東関東馬事学院 統合プラットフォーム</p>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-gray-500">
              東関東馬事高等学院・東関東馬事専門学院の入学管理から在校生管理、一口支援者への報告までを一元化する統合管理システムです。
            </p>
            <div className="mt-5 flex flex-col gap-2 text-xs">
              {Object.values(OFFICIAL_SITES).map((site) => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-gray-600 transition hover:text-brand-700"
                >
                  <ExternalLink className="h-3 w-3" /> {site.name} 公式サイト
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-700">入学をお考えの方</p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li><Link href="/request" className="transition hover:text-brand-700">資料請求</Link></li>
              <li><Link href="/mypage" className="transition hover:text-brand-700">マイページ</Link></li>
              <li><Link href="/mypage/events" className="transition hover:text-brand-700">学校見学・オープンキャンパス</Link></li>
              <li><Link href="/login" className="transition hover:text-brand-700">ログイン</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-700">在校生・関係者の方</p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li><Link href="/student" className="transition hover:text-brand-700">在校生ポータル</Link></li>
              <li><Link href="/parent" className="transition hover:text-brand-700">保護者ポータル</Link></li>
              <li><Link href="/supporter" className="transition hover:text-brand-700">一口支援者ポータル</Link></li>
              <li><Link href="/admin" className="transition hover:text-brand-700">職員ダッシュボード</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-brand-100 pt-6 text-center text-[11px] text-gray-400">
          © 東関東馬事高等学院・東関東馬事専門学院 入学・在校生統合管理システム
        </div>
      </footer>
    </div>
  );
}
