"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, UserCog, LayoutDashboard } from "lucide-react";

/**
 * ログイン中ユーザーのアバター+氏名。
 * クリックでドロップダウン(個人情報の変更 / ホーム画面へ / ログアウト)を表示。
 */
export default function UserMenu({
  name,
  roleLabel,
  homeHref,
  homeLabel,
  logout,
}: {
  name: string;
  roleLabel: string;
  homeHref: string;
  homeLabel: string;
  logout: () => Promise<void>;
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
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {name.trim().charAt(0)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-gray-800">{name}</span>
          <span className="block text-[11px] leading-tight text-gray-400">{roleLabel}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl">
          <div className="border-b border-gray-100 px-4 py-2 sm:hidden">
            <p className="text-sm font-semibold text-gray-800">{name}</p>
            <p className="text-[11px] text-gray-400">{roleLabel}</p>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50"
          >
            <UserCog size={16} className="text-gray-400" />
            個人情報の変更
          </Link>
          <Link
            href={homeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50"
          >
            <LayoutDashboard size={16} className="text-gray-400" />
            {homeLabel}
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
