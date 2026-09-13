"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, MessageCircle, X } from "lucide-react";
import ChatPanel from "@/components/chatbot";

/**
 * ヘッダー右側の「LINE / お問い合わせ / AIチャット」。
 * 画面上の面積を取らないよう、3つともアイコンのみで並べる (文字ラベルは持たない)。
 * ラベルは aria-label と title で読み上げ・ツールチップに残している。
 * AIチャットは画面中央のモーダルで開く。
 */
const ICON_BTN =
  "flex h-9 w-9 shrink-0 items-center justify-center border border-gray-300 bg-white transition hover:border-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export default function HeaderActions() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <a
        href={process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || "https://line.me"}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ICON_BTN} text-[#06C755]`}
        aria-label="LINEで相談する"
        title="LINEで相談する"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      </a>

      <Link href="/contact" className={`${ICON_BTN} text-gray-700`} aria-label="お問い合わせ" title="お問い合わせ">
        <Mail className="h-5 w-5" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={() => setChatOpen((v) => !v)}
        aria-expanded={chatOpen}
        aria-label={chatOpen ? "AIビデオチャットを閉じる" : "あかりにビデオチャットで質問する"}
        title={chatOpen ? "AIビデオチャットを閉じる" : "あかりにビデオチャットで質問する"}
        className={`${ICON_BTN} ${chatOpen ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700" : "text-brand-600"}`}
      >
        {chatOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
      </button>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
