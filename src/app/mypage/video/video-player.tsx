"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";
import { reportVideoProgressAction } from "./actions";

const DURATION_MS = 20000; // 約20秒で視聴完了
const TICK_MS = 200;
const STEP = 100 / (DURATION_MS / TICK_MS);

export default function VideoPlayer({ initialCompleted }: { initialCompleted: boolean }) {
  const router = useRouter();
  const [percent, setPercent] = useState(initialCompleted ? 100 : 0);
  const [playing, setPlaying] = useState(false);
  /** 一度でも視聴完了したか（CTA表示・進捗記録用） */
  const [completed, setCompleted] = useState(initialCompleted);
  const sentRef = useRef<Set<number>>(new Set(initialCompleted ? [25, 50, 75, 100] : []));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const reportMilestone = useCallback(
    (milestone: number) => {
      if (sentRef.current.has(milestone)) return;
      sentRef.current.add(milestone);
      void reportVideoProgressAction(milestone).then(() => {
        if (milestone === 100) router.refresh();
      });
    },
    [router]
  );

  const start = (fromBeginning = false) => {
    if (playing) return;
    stopTimer();
    if (fromBeginning || percent >= 100) {
      setPercent(0);
    }
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setPercent((prev) => {
        const next = Math.min(100, prev + STEP);
        for (const m of [25, 50, 75]) {
          if (prev < m && next >= m) reportMilestone(m);
        }
        if (next >= 100) {
          stopTimer();
          setPlaying(false);
          setCompleted(true);
          reportMilestone(100);
        }
        return next;
      });
    }, TICK_MS);
  };

  const pause = () => {
    stopTimer();
    setPlaying(false);
  };

  return (
    <div>
      {/* 疑似動画プレイヤー */}
      <div className="relative overflow-hidden rounded-xl bg-emerald-950 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/banner-video.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center text-white">
          <h2 className="mt-4 text-lg font-bold drop-shadow">東関東馬事高等学院・専門学院 学院紹介</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90">
            千葉県の豊かな自然の中、馬とともに学び、暮らす。
            騎手・厩務員・牧場スタッフ・乗馬インストラクター——
            馬のプロを目指す仲間たちの一日と、寮生活・実習の様子をご紹介します。
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!playing && percent < 100 && (
              <button
                type="button"
                onClick={() => start(false)}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-white"
              >
                ▶ {percent > 0 ? "続きから再生" : "再生する"}
              </button>
            )}
            {playing && (
              <button
                type="button"
                onClick={pause}
                className="inline-flex items-center gap-2 rounded-full bg-white/25 px-6 py-3 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-white/35"
              >
                ⏸ 一時停止
              </button>
            )}
            {!playing && (completed || percent >= 100) && (
              <button
                type="button"
                onClick={() => start(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:bg-white"
              >
                ↻ もう一度再生する
              </button>
            )}
          </div>

          {completed && !playing && percent >= 100 && (
            <p className="mt-4 rounded-full bg-emerald-500/90 px-5 py-1.5 text-xs font-bold text-white shadow">
              ✓ 視聴完了
            </p>
          )}
        </div>

        {/* 進捗バー */}
        <div className="absolute inset-x-0 bottom-0 h-2 bg-black/30">
          <div
            className="h-full bg-amber-300 transition-[width] duration-200 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>再生時間: 約20秒 (デモ)</span>
        <span className="font-semibold">{Math.floor(percent)}%</span>
      </div>

      {completed && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-bold text-emerald-800">動画のご視聴ありがとうございました🎉</p>
          <p className="mt-1 text-sm text-emerald-700">次は入学仮審査アンケートにご回答ください。</p>
          <Link href="/mypage/survey" className={`${btnPrimary} mt-4`}>
            仮審査アンケートへ進む →
          </Link>
        </div>
      )}
    </div>
  );
}
