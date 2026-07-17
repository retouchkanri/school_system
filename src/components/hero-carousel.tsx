"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/images/hero-1.jpg", alt: "馬と生徒たちの出会い。" },
  { src: "/images/hero-2.jpg", alt: "実際に馬に乗って学ぶ。" },
  { src: "/images/hero-3.jpg", alt: "馬を愛すること。その気持ちは、きっと伝わります。" },
  { src: "/images/hero-4.jpg", alt: "馬との絆を育む3年間。" },
  { src: "/images/hero-5.jpg", alt: "仲間と支え合う学院生活。" },
];

/** ホーム画面ヒーロー: 5枚の背景写真を3秒ごとにクロスフェード切り替え */
export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-[320px] w-full overflow-hidden sm:h-[420px]">
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
        {SLIDES.map((slide, i) => (
          <span
            key={slide.src}
            className={`h-1.5 w-1.5 rounded-full transition ${i === index ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
