"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

type MobileNavItem = {
  href: string;
  label: string;
  className: string;
  /** 外部サイト (公式サイト) へのリンクは別タブで開く */
  external?: boolean;
};

/**
 * モバイル幅で公開ナビ(資料請求/ログイン)をハンバーガーメニューに折り込む。
 * sm以上では非表示 (SiteHeader側で通常のボタン列を表示)。
 */
export default function MobileNav({ items }: { items: readonly MobileNavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative sm:hidden" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center text-gray-800 transition hover:text-brand-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="メニューを開く"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 flex w-48 flex-col gap-2 border border-gray-200 bg-white p-3 shadow-xl">
          {items.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`${item.className} w-full`}
              >
                {item.label}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`${item.className} w-full`}
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
