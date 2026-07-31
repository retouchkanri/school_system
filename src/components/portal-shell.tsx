"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type NavTone = "brand" | "blue" | "amber" | "purple" | "teal";

const TONE_STYLES: Record<NavTone, { active: string; inactive: string }> = {
  brand: {
    active: "bg-brand-600 text-white shadow-md shadow-brand-900/20",
    inactive: "border border-brand-200 bg-brand-50/90 text-brand-700 hover:bg-brand-100",
  },
  blue: {
    active: "bg-blue-600 text-white shadow-md shadow-blue-900/20",
    inactive: "border border-blue-200 bg-blue-50/90 text-blue-700 hover:bg-blue-100",
  },
  amber: {
    active: "bg-amber-600 text-white shadow-md shadow-amber-900/20",
    inactive: "border border-amber-200 bg-amber-50/90 text-amber-700 hover:bg-amber-100",
  },
  purple: {
    active: "bg-purple-600 text-white shadow-md shadow-purple-900/20",
    inactive: "border border-purple-200 bg-purple-50/90 text-purple-700 hover:bg-purple-100",
  },
  teal: {
    active: "bg-teal-600 text-white shadow-md shadow-teal-900/20",
    inactive: "border border-teal-200 bg-teal-50/90 text-teal-700 hover:bg-teal-100",
  },
};

const DEFAULT_STYLE = {
  active: "bg-brand-600 text-white shadow-sm",
  inactive: "border border-gray-200 bg-white/90 text-gray-600 hover:bg-brand-50 hover:text-brand-700",
};

export interface PortalNavItem {
  href: string;
  label: string;
  /**
   * フェーズ配下のページ。指定すると上段タブは「章」として振る舞い、
   * その章が選択されている間だけ下段にページ単位のサブタブを表示する。
   */
  children?: { href: string; label: string }[];
  /** タブごとの色分け (未指定なら既定のブランド色/グレー配色) */
  tone?: NavTone;
  /**
   * タブに添えるアイコン (未指定ならラベルのみ)。
   * サーバーコンポーネントから渡すため、コンポーネント参照ではなく
   * 描画済みの要素 (例: <Compass className="h-4 w-4" />) を渡すこと。
   */
  icon?: React.ReactNode;
}

/** パスがそのhrefに属するか (完全一致 or 配下) */
function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * ポータル共通のタブナビ。
 * children を持つ項目は「章」としてまとめられるため、上段のタブ数を抑えられる。
 * 現在地のタブはモバイルでも画面外に隠れないよう、横スクロール位置を自動で中央へ寄せる。
 */
export default function PortalNav({
  items,
  home,
  center = false,
}: {
  items: PortalNavItem[];
  home: string;
  /** タブ数が少ない画面 (デスクトップ幅) で中央寄せにする。モバイルは常に左詰め+自動スクロール */
  center?: boolean;
}) {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // 最も長く一致した href の項目を選択。どれにも一致しなければホーム(進捗)を選択する
  let activeIndex = -1;
  let bestLength = -1;
  items.forEach((item, i) => {
    const hrefs = [item.href, ...(item.children?.map((c) => c.href) ?? [])];
    for (const href of hrefs) {
      if (href === home) continue; // ホームは他が一致しなかったときの受け皿にする
      if (matches(pathname, href) && href.length > bestLength) {
        activeIndex = i;
        bestLength = href.length;
      }
    }
  });
  if (activeIndex < 0) activeIndex = items.findIndex((i) => i.href === home);

  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const subItems = activeItem?.children && activeItem.children.length > 1 ? activeItem.children : null;

  // 現在のタブを横スクロール内の中央へ寄せる (ページ自体はスクロールさせない)
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;
    const target = active.offsetLeft - (scroller.clientWidth - active.clientWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeIndex, pathname]);

  return (
    <div>
      <nav
        ref={scrollerRef}
        className={`scrollbar-none -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 ${
          center ? "justify-start sm:justify-center" : ""
        }`}
      >
        {items.map((item, i) => {
          const active = i === activeIndex;
          const style = item.tone ? TONE_STYLES[item.tone] : DEFAULT_STYLE;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                active ? style.active : style.inactive
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {subItems && (
        <nav className="scrollbar-none -mx-1 mt-2 flex gap-1 overflow-x-auto px-1">
          {subItems.map((sub) => {
            const active = matches(pathname, sub.href);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] font-semibold transition ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-brand-600"
                }`}
              >
                {sub.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
