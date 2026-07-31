import { logoutAction } from "@/app/login/actions";
import PortalNav, { type PortalNavItem } from "@/components/portal-shell";
import PortalBackground from "@/components/portal-background";
import PortalProgress from "@/components/portal-progress";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";
import type { Profile } from "@/lib/types";

export default function PortalLayout({
  profile,
  roleLabel,
  nav,
  home,
  statusHref,
  progress,
  children,
}: {
  profile: Profile;
  roleLabel: string;
  nav: PortalNavItem[];
  home: string;
  statusHref?: string;
  /** 入学までの進捗 (入学希望者マイページのみ。指定するとナビ上部にバーを表示) */
  progress?: { current: number; total: number; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <PortalBackground />
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex w-full items-stretch">
          <SiteLogo variant="brand" href="/" className="shrink-0" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-[5vw]">
            <span className="hidden bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 sm:inline">
              {roleLabel}ページ
            </span>
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
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        {progress && <PortalProgress {...progress} />}
        <PortalNav items={nav} home={home} center={!!progress} />
        <main className="mt-5 pb-4">{children}</main>
        <p className="mt-10 text-center text-[11px] text-gray-400">
          背景写真: 東関東馬事高等学院・東関東馬事専門学院
        </p>
      </div>
    </div>
  );
}
