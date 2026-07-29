import { logoutAction } from "@/app/login/actions";
import PortalNav, { type PortalNavItem } from "@/components/portal-shell";
import PortalBackground from "@/components/portal-background";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";
import type { Profile } from "@/lib/types";

export default function PortalLayout({
  profile,
  roleLabel,
  nav,
  home,
  statusHref,
  children,
}: {
  profile: Profile;
  roleLabel: string;
  nav: PortalNavItem[];
  home: string;
  statusHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <PortalBackground />
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/90 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-[5vw] py-4">
          <div className="flex items-center gap-3">
            <SiteLogo href="/" />
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 sm:inline">
              {roleLabel}ページ
            </span>
          </div>
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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="border border-white/70 bg-white/85 p-4 shadow-xl shadow-brand-900/5 backdrop-blur-sm sm:p-6">
          <PortalNav items={nav} home={home} />
          <main className="mt-4 pb-4">{children}</main>
        </div>
        <p className="mt-6 text-center text-[11px] text-gray-400">
          背景写真: 東関東馬事高等学院・東関東馬事専門学院
        </p>
      </div>
    </div>
  );
}
