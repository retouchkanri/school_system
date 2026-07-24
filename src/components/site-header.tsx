import Link from "next/link";
import SiteLogo from "@/components/site-logo";
import { btnPrimary, btnSecondary } from "@/components/ui";

type SiteHeaderProps = {
  /** ログイン・資料請求ボタンを表示するか（公開ページ向け） */
  showNav?: boolean;
};

/** 全公開ページ共通のサイトヘッダー */
export default function SiteHeader({ showNav = true }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 bg-white/95 py-4 pl-[5vw] pr-[calc(5vw_+_4rem)] backdrop-blur sm:py-5">
      {/* pr は右端固定の LINE/お問い合わせフローティングボタン(w-12 + pr-2)と重ならないよう余白を確保 */}
      <SiteLogo />
      {showNav && (
        <nav className="flex items-center gap-3">
          <Link href="/login" className={btnSecondary}>
            ログイン
          </Link>
          <Link href="/request" className={btnPrimary}>
            資料請求
          </Link>
        </nav>
      )}
    </header>
  );
}
