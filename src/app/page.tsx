import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/ui";

const FLOW = [
  { step: "STEP 1", title: "資料請求", desc: "フォームから簡単1分。学院パンフレットをお送りします。" },
  { step: "STEP 2", title: "動画視聴・仮審査", desc: "学院紹介動画とアンケートで、あなたに合った学び方をご提案。" },
  { step: "STEP 3", title: "学校見学・オープンキャンパス", desc: "実際に馬とふれあい、寮や施設を見学できます。" },
  { step: "STEP 4", title: "出願・適性検査", desc: "願書提出と性格・適性検査で、あなたの強みを分析。" },
  { step: "STEP 5", title: "合格・入学手続き", desc: "オンラインで入学手続きが完結。入学式でお会いしましょう。" },
];

const FEATURES = [
  {
    img: "/images/horse-2.jpg",
    title: "馬とともに暮らす3年間",
    desc: "担当馬を持ち、毎日の手入れから騎乗まで。馬との信頼関係づくりがすべての学びの土台になります。",
  },
  {
    img: "/images/campus-1.jpg",
    title: "騎手・厩務員への確かな進路",
    desc: "JRA・地方競馬・乗馬クラブ・牧場へ。座学と実習を組み合わせたカリキュラムで馬業界への就職を支援します。",
  },
  {
    img: "/images/horse-1.jpg",
    title: "全寮制だから身につく生活力",
    desc: "仲間と過ごす寮生活の中で、早起きの習慣も、協調性も、自然と身についていきます。",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-100 bg-white/95 px-[5vw] py-5 backdrop-blur">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="馬事学院/東関東馬事専門学院" className="h-12 w-auto" />
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className={btnSecondary}>
            ログイン
          </Link>
          <Link href="/request" className={btnPrimary}>
            資料請求
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.jpg"
            alt="馬を愛すること。その気持ちは、きっと伝わります。"
            className="h-[320px] w-full object-cover sm:h-[420px]"
          />
        </section>

        <section className="px-[5vw] py-14 text-center">
          <p className="text-sm font-bold tracking-widest text-brand-600">HIGASHIKANTO HORSEPACK</p>
          <h1 className="mt-3 text-2xl font-bold leading-snug text-gray-900 sm:text-4xl">
            馬と生きる、未来をつくる。
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            騎手、厩務員、乗馬インストラクター——。馬のプロフェッショナルを目指すあなたを、
            資料請求から入学、そして入学後の学院生活まで一貫してサポートします。
          </p>
          <div className="mt-7 flex justify-center gap-4">
            <Link href="/request" className={`${btnPrimary} px-8 py-3 text-base`}>
              無料で資料請求する
            </Link>
          </div>
        </section>

        <section className="bg-brand-50/60 px-[5vw] py-14">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900">学院の特色</h2>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.img} alt={f.title} className="h-44 w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-[5vw] py-14">
          <h2 className="mb-8 text-center text-xl font-bold text-gray-900">入学までの流れ</h2>
          <ol className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-5">
            {FLOW.map((f) => (
              <li key={f.step} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-brand-600">{f.step}</p>
                <h3 className="mt-1 text-sm font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{f.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/visual-3.jpg" alt="馬を褒めること。" className="h-[260px] w-full object-cover sm:h-[340px]" />
        </section>

        <section className="px-[5vw] py-14 text-center">
          <h2 className="text-lg font-bold text-gray-900">まずは資料請求から</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
            パンフレットのお届け後、学院紹介動画・オープンキャンパスのご案内をお送りします。
          </p>
          <Link href="/request" className={`${btnPrimary} mt-6 px-8 py-3 text-base`}>
            資料請求フォームへ
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white px-[5vw] py-8 text-center text-xs text-gray-400">
        © 東関東馬事高等学院・東関東馬事専門学院 入学・在校生統合管理システム
      </footer>
    </div>
  );
}
