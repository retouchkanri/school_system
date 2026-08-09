"use client";

import { useRef, useState, type ReactNode } from "react";
import { PanelLeftOpen, X } from "lucide-react";

/**
 * ポータル/管理画面で共通に使う左サイドの器。
 *
 * - デスクトップ (lg以上): 常に開いた状態で本文の左に並ぶ。画面の高さいっぱいの
 *   1枚のパネル (罫線なし・本文よりわずかに沈んだ色) になり、中身はその中だけで
 *   独立してスクロールする (ヘッダーやこのパネル自体は動かない)。
 * - モバイル: 幅 3.5rem のアイコンだけのレールになり、
 *   レール上を横にスワイプする (またはボタンを押す) と中身が重なって開く
 *
 * 中身は railIcons (レール用のアイコン列) と children (開いたときの中身) の2つを受け取る。
 */
export default function SideRail({
  railIcons,
  children,
  label = "メニュー",
}: {
  railIcons: ReactNode;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  /** 横方向に一定距離スワイプしたら開閉を切り替える (左右どちらでも同じ) */
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) < 40) return;
    setOpen((v) => !v);
  }

  return (
    <aside
      className="relative w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50 lg:w-60"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label={label}
    >
      {/* モバイル: アイコンだけのレール (罫線なし。本文より少し沈んだ色の上に直接並べる) */}
      <div className="flex h-full flex-col items-center gap-1 overflow-y-auto py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `${label}を閉じる` : `${label}を開く`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-white hover:text-gray-900"
        >
          {open ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </button>
        <div className="h-px w-7 shrink-0 bg-gray-200" />
        {railIcons}
      </div>

      {/* デスクトップ: 常に開いた中身。パネルの高さいっぱいで独立スクロール */}
      <div className="hidden h-full overflow-y-auto p-2.5 lg:block">{children}</div>

      {/* モバイル: スワイプ/タップで開く中身 (レールの右隣に重ねる) */}
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute left-full top-0 z-40 ml-2 max-h-[70vh] w-[min(78vw,17rem)] overflow-y-auto lg:hidden"
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
