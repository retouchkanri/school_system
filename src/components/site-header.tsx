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
    <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-100 bg-white/95 px-[5vw] py-5 backdrop-blur">
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
