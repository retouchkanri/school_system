"use client";

import { useEffect, useRef, useState } from "react";

type CounterProps = {
  /** 最終値 */
  value: number;
  /** 値の後ろに付ける単位 (例: "ステップ") */
  suffix?: string;
  prefix?: string;
  /** カウントアップ時間 (ms) */
  duration?: number;
  className?: string;
};

/** 画面内に入ったら 0 から value までカウントアップする数字 */
export default function Counter({ value, suffix = "", prefix = "", duration = 1600, className = "" }: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started.current) return;
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // easeOutCubic で減速しながら到達
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(value * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
