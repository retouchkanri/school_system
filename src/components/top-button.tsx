"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

/** ヘッダーより下へスクロールすると右下に現れる「Top」ボタン */
export default function TopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 96);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-4 z-40 flex h-12 w-12 flex-col items-center justify-center rounded-md bg-brand-600 text-white shadow-lg transition hover:bg-brand-700"
      aria-label="ページの先頭へ戻る"
    >
      <ChevronUp size={18} strokeWidth={3} />
      <span className="text-[10px] font-bold leading-none">Top</span>
    </button>
  );
}
