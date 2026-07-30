"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 画面右側に常時表示する LINE / お問い合わせボタン。
 * 管理画面(/admin)では非表示。
 * LINEのリンク先は NEXT_PUBLIC_LINE_ADD_FRIEND_URL (公式アカウントの友だち追加URL) で設定できます。
 */
export default function FloatingContact() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/contact")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex sm:left-auto sm:right-0 sm:top-0 sm:bottom-0 sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:pr-2">
      <a
        href={process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || "https://line.me"}
        target="_blank"
        rel="noopener noreferrer"
        className="shine pointer-events-auto relative flex h-14 flex-1 flex-row items-center justify-center gap-2 overflow-hidden bg-[#06C755] shadow-md transition hover:bg-[#05b34c] sm:h-44 sm:w-12 sm:flex-none sm:flex-col sm:justify-center sm:gap-1.5 sm:rounded-md"
        aria-label="LINE"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
        <span className="font-serif flex items-center gap-0.5 text-sm font-bold leading-none text-white sm:flex-col sm:gap-1.5 sm:text-[13px] sm:leading-[1.2]">
          <span className="sm:hidden">LINE</span>
          <span className="hidden sm:inline">L</span>
          <span className="hidden sm:inline">I</span>
          <span className="hidden sm:inline">N</span>
          <span className="hidden sm:inline">E</span>
        </span>
      </a>

      <Link
        href="/contact"
        className="shine pointer-events-auto relative flex h-14 flex-1 items-center justify-center overflow-hidden bg-brand-800 shadow-md transition hover:bg-brand-900 sm:h-44 sm:w-12 sm:flex-none sm:rounded-md"
        aria-label="お問い合わせ"
      >
        <span className="font-serif text-sm font-bold text-white sm:[writing-mode:vertical-rl] sm:text-[13px] sm:tracking-[0.2em]">
          お問い合わせ
        </span>
      </Link>
    </div>
  );
}
