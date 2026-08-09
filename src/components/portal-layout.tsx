import { logoutAction } from "@/app/login/actions";
import { type PortalNavItem } from "@/components/portal-shell";
import PortalSidebar from "@/components/portal-sidebar";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";
import HeaderActions from "@/components/header-actions";
import type { LeadStatus, Profile } from "@/lib/types";

/**
 * ポータル共通レイアウト。
 * ヘッダーを画面上部に固定し、その下を「左サイドバー + 本文」の2カラムにする。
 * 左右どちらも画面の高さに収め、それぞれが独立してスクロールする
 * (ページ全体はスクロールしない = ヘッダーと左サイドバーは常に同じ位置に留まる)。
 * サイドバーはモバイルではアイコンだけのレールになり、スワイプで開く。
 */
export default function PortalLayout({
  profile,
  roleLabel,
  nav,
  home,
  statusHref,
  status,
  children,
}: {
  profile: Profile;
  roleLabel: string;
  nav: PortalNavItem[];
  home: string;
  statusHref?: string;
  /** 入学希望者マイページのみ。渡すとサイドバーに18ステップの5セクションを表示する */
  status?: LeadStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell flex h-dvh flex-col bg-white">
      <header className="z-20 flex shrink-0 items-stretch border-b border-gray-200 bg-white">
        <SiteLogo variant="brand" href="/" className="shrink-0" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-4 sm:px-6">
          <span className="hidden bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 sm:inline">
            {roleLabel}ページ
          </span>
          <HeaderActions />
          <UserMenu
            name={profile.full_name}
            roleLabel={roleLabel}
            homeHref={home}
            homeLabel="マイページ"
            logout={logoutAction}
            avatarUrl={profile.avatar_url}
            statusHref={statusHref}
            statusLabel="現在の状態"
          />
        </div>
      </header>

      {/* 画面幅いっぱいに広げる (max-w で中央寄せしない)。左右それぞれが独立スクロール */}
      <div className="flex min-h-0 flex-1 gap-4 px-4 py-5 sm:gap-6 sm:px-6">
        <PortalSidebar nav={nav} home={home} status={status} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-6">{children}</main>
      </div>
    </div>
  );
}
