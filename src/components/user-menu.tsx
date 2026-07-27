"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, UserCog, LayoutDashboard, ListChecks } from "lucide-react";

/**
 * ログイン中ユーザーのアバター+氏名。
 * クリックでドロップダウン(マイページ / 現在の状態 / 個人情報の変更 / ログアウト)を表示。
 */
export default function UserMenu({
  name,
  homeHref,
  homeLabel = "マイページ",
  logout,
  avatarUrl,
  statusHref,
  statusLabel = "現在の状態",
}: {
  name: string;
  /** @deprecated ヘッダーには表示しない (後方互換のため残置) */
  roleLabel?: string;
  homeHref: string;
  homeLabel?: string;
  logout: () => Promise<void>;
  avatarUrl?: string | null;
  /** 指定時のみ「現在の状態」メニューを表示 */
  statusHref?: string;
  statusLabel?: string;
}) {
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {name.trim().charAt(0)}
          </span>
        )}
        <span className="hidden text-sm font-semibold text-gray-800 sm:block">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 border border-gray-200 bg-white py-1.5 shadow-xl">
          <div className="border-b border-gray-100 px-4 py-2 sm:hidden">
            <p className="text-sm font-semibold text-gray-800">{name}</p>
          </div>
          <Link
            href={homeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50"
          >
            <LayoutDashboard size={16} className="text-gray-400" />
            {homeLabel}
          </Link>
          {statusHref && (
            <Link
              href={statusHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50"
            >
              <ListChecks size={16} className="text-gray-400" />
              {statusLabel}
            </Link>
          )}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50"
          >
            <UserCog size={16} className="text-gray-400" />
            個人情報の変更
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <form action={logout}>
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50">
              <LogOut size={16} />
              ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
