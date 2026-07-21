"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** アニメーションの種類 */
  variant?: "up" | "down" | "left" | "right" | "zoom" | "fade";
  /** 表示開始までの遅延 (ms) — 子要素を順番に出したいときに使用 */
  delay?: number;
  /** 一度表示したら戻さない (デフォルト true) */
  once?: boolean;
  as?: "div" | "section" | "li" | "span";
};

const HIDDEN: Record<NonNullable<RevealProps["variant"]>, string> = {
  up: "opacity-0 translate-y-8",
  down: "opacity-0 -translate-y-8",
  left: "opacity-0 translate-x-10",
  right: "opacity-0 -translate-x-10",
  zoom: "opacity-0 scale-95",
  fade: "opacity-0",
};

/** スクロールで画面内に入ったらふわっと表示する汎用ラッパー */
export default function Reveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
  once = true,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? "opacity-100 translate-x-0 translate-y-0 scale-100" : HIDDEN[variant]
      } ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
