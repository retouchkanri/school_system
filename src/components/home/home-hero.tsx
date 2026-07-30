"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Slide = {
  src: string;
  alt: string;
  /** サムネイルナビに出す短いラベル */
  label: string;
  /** 見出し。改行したい箇所は \n で指定 (1文字ずつフェードインする) */
  catch: string;
  /** 見出し下の説明文 */
  desc: string;
};

/** 見出しを1文字ずつフェードインさせる (soushin.ed.jp のキネティックタイポグラフィ風演出) */
function CatchHeadline({ text }: { text: string }) {
  let charIndex = 0;
  return (
    <>
      {text.split("\n").map((line, li) => (
        <span key={li} className="block">
          {[...line].map((ch, ci) => {
            const delay = charIndex * 45;
            charIndex += 1;
            return (
              <span
                key={ci}
                className="animate-char-in inline-block"
                style={{ animationDelay: `${delay}ms` }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}

/**
 * トップページのフルスクリーンヒーロー。
 * 公式サイト由来の写真を Ken Burns (ゆっくりズーム) しながらクロスフェード。
 * スライドごとに見出し・説明文が切り替わり、下部のサムネイル帯から直接ジャンプできる。
 */
export default function HomeHero({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides[index];
  const catchCharCount = current.catch.replace(/\n/g, "").length;
  const descDelay = catchCharCount * 45 + 450;
  const goTo = (i: number) => setIndex(i);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <section className="relative h-[92vh] min-h-[620px] w-full overflow-hidden bg-brand-900">
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

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-[6vw] pb-28 text-center text-white sm:pb-32">
        <p
          className={`text-xs font-bold tracking-[0.5em] text-brand-100/90 transition-all duration-1000 sm:text-sm ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          HIGASHIKANTO BAJIGAKU PLATFORM
        </p>

        <h1
          key={`catch-${index}`}
          className="mt-6 text-3xl font-bold leading-relaxed drop-shadow-lg sm:text-5xl sm:leading-snug"
        >
          <CatchHeadline text={current.catch} />
        </h1>

        <p
          key={`desc-${index}`}
          className="animate-char-in mx-auto mt-6 max-w-2xl text-sm leading-loose text-white/85 sm:text-base"
          style={{ animationDelay: `${descDelay}ms` }}
        >
          {current.desc}
        </p>

        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all delay-700 duration-1000 ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <Link
            href="/request"
            className="inline-flex min-h-[56px] min-w-[220px] items-center justify-center bg-brand-600 px-8 text-base font-semibold text-white transition duration-300 ease-out hover:bg-accent-500"
          >
            無料で資料請求する
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[56px] min-w-[220px] items-center justify-center border border-white bg-transparent px-8 text-base font-semibold text-white transition duration-300 ease-out hover:bg-white hover:text-brand-800"
          >
            マイページログイン
          </Link>
        </div>
      </div>

      {/* サムネイル+キャプションのスライドナビ */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent pb-5 pt-12 sm:pb-7">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-[5vw] sm:gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="前のスライドへ"
            className="hidden shrink-0 items-center justify-center rounded-full border border-white/40 p-2 text-white/80 transition hover:border-white hover:bg-white/10 hover:text-white sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="scrollbar-none flex flex-1 gap-2 overflow-x-auto sm:justify-center sm:gap-3">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${slide.label}を表示`}
                aria-current={i === index}
                className={`group relative shrink-0 overflow-hidden border-b-2 transition-all duration-300 ${
                  i === index ? "border-white opacity-100" : "border-transparent opacity-45 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.src} alt="" className="h-11 w-[4.5rem] object-cover sm:h-14 sm:w-24" />
                <span className="absolute inset-x-0 bottom-0 hidden bg-black/50 px-1.5 py-1 text-left text-[10px] font-semibold leading-tight text-white sm:block">
                  {slide.label}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="次のスライドへ"
            className="hidden shrink-0 items-center justify-center rounded-full border border-white/40 p-2 text-white/80 transition hover:border-white hover:bg-white/10 hover:text-white sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
