"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

type Slide = { src: string; alt: string };

/**
 * トップページのフルスクリーンヒーロー。
 * 公式サイト由来の写真を Ken Burns (ゆっくりズーム) しながらクロスフェード。
 */
export default function HomeHero({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative h-[92vh] min-h-[540px] w-full overflow-hidden bg-brand-900">
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${
            i === index ? "opacity-100 animate-kenburns" : "opacity-0"
          }`}
        />
      ))}

      {/* 文字を読みやすくするグラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 to-transparent" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-[6vw] text-center text-white">
        <p
          className={`text-xs font-bold tracking-[0.5em] text-brand-100/90 transition-all duration-1000 sm:text-sm ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          HIGASHIKANTO BAJIGAKU PLATFORM
        </p>
        <h1
          className={`mt-6 text-3xl font-bold leading-relaxed drop-shadow-lg transition-all delay-200 duration-1000 sm:text-5xl sm:leading-snug ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          馬と生きる、
          <br className="sm:hidden" />
          未来をつくる。
        </h1>
        <p
          className={`mx-auto mt-6 max-w-2xl text-sm leading-loose text-white/85 transition-all delay-500 duration-1000 sm:text-base ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          東関東馬事高等学院・東関東馬事専門学院。
          <br />
          資料請求から入学、そして毎日の学院生活まで――
          <br className="sm:hidden" />
          ふたつの学院を、ひとつのプラットフォームで。
        </p>
        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all delay-700 duration-1000 ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <Link
            href="/request"
            className="shine relative overflow-hidden rounded-lg bg-brand-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-900/40 transition hover:-translate-y-0.5 hover:bg-brand-500"
          >
            無料で資料請求する
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/60 bg-white/10 px-8 py-3.5 text-base font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            マイページログイン
          </Link>
        </div>
      </div>

      {/* スライドインジケーター */}
      <div className="absolute inset-x-0 bottom-16 z-10 flex justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => setIndex(i)}
            aria-label={`スライド${i + 1}へ`}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === index ? "w-8 bg-white" : "w-4 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* スクロールを促す矢印 */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
        <ChevronDown className="h-6 w-6 animate-bounce text-white/70" />
      </div>
    </section>
  );
}
