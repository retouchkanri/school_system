"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui";
import { INTRO_VIDEO_URL } from "@/lib/constants";
import { reportVideoProgressAction } from "./actions";

const MILESTONES = [25, 50, 75] as const;

export default function VideoPlayer({ initialCompleted }: { initialCompleted: boolean }) {
  const router = useRouter();
  const [percent, setPercent] = useState(initialCompleted ? 100 : 0);
  /** 一度でも視聴完了したか（CTA表示・進捗記録用） */
  const [completed, setCompleted] = useState(initialCompleted);
  const sentRef = useRef<Set<number>>(new Set(initialCompleted ? [25, 50, 75, 100] : []));

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

  /** 実再生の timeupdate から進捗率を算出し、25/50/75% のマイルストーンを記録 */
  const onTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    if (!el.duration || Number.isNaN(el.duration)) return;
    const pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
    setPercent((prev) => (pct > prev ? pct : prev));
    for (const m of MILESTONES) {
      if (pct >= m) reportMilestone(m);
    }
  };

  /** 最後まで再生されたら視聴完了として記録 */
  const onEnded = () => {
    setPercent(100);
    setCompleted(true);
    for (const m of MILESTONES) reportMilestone(m);
    reportMilestone(100);
  };

  return (
    <div>
      {/* 画面が広いと動画が大きくなりすぎるため、幅の上限を content の半分程度に抑える */}
      <div className="max-w-xl overflow-hidden rounded-lg bg-brand-900 shadow-md">
        <video
          src={INTRO_VIDEO_URL}
          poster="/images/banner-video.jpg"
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          className="aspect-video h-auto w-full bg-black"
        >
          お使いのブラウザは動画の再生に対応していません。
        </video>
      </div>

      <div className="mt-3 flex max-w-xl items-center justify-between text-xs text-gray-500">
        <span>東関東馬事高等学院・専門学院 学院紹介（約5分）</span>
        <span className="font-semibold">{Math.floor(percent)}%</span>
      </div>

      {completed && (
        <div className="mt-6 max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm font-bold text-emerald-800">動画のご視聴ありがとうございました</p>
          <p className="mt-1 text-sm text-emerald-700">次は入学仮審査アンケートにご回答ください。</p>
          <Link href="/mypage/survey" className={`${btnPrimary} mt-4`}>
            仮審査アンケートへ進む →
          </Link>
        </div>
      )}
    </div>
  );
}
