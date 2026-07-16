"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 画面右側に常時表示する LINE / お問い合わせボタン。
 * 管理画面(/admin)では非表示。
 * LINEのリンク先は公式アカウントのURLに差し替えてください。
 */
export default function FloatingContact() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2 pr-2">
      <a
        href="https://line.me"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-12 flex-col items-center justify-center rounded-md border border-gray-200 bg-white shadow-md transition hover:shadow-lg"
        aria-label="LINEで相談"
      >
        <span className="text-[13px] font-bold leading-tight text-[#06C755]">LINE</span>
        <span className="mt-0.5 text-[9px] text-gray-500">相談</span>
      </a>

      <Link
        href="/request"
        className="shine relative flex w-12 items-center justify-center overflow-hidden rounded-md bg-blue-950 py-5 shadow-md transition hover:bg-blue-900"
        aria-label="お問い合わせ"
      >
        <span
          className="text-[13px] font-bold tracking-[0.2em] text-white"
          style={{ writingMode: "vertical-rl" }}
        >
          お問い合わせ
        </span>
      </Link>
    </div>
  );
}
