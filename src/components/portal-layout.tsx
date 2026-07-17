import { logoutAction } from "@/app/login/actions";
import PortalNav, { type PortalNavItem } from "@/components/portal-shell";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";
import type { Profile } from "@/lib/types";

export default function PortalLayout({
  profile,
  roleLabel,
  nav,
  home,
  children,
}: {
  profile: Profile;
  roleLabel: string;
  nav: PortalNavItem[];
  home: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center justify-between px-[5vw] py-4">
          <div className="flex items-center gap-3">
            <SiteLogo />
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 sm:inline">
              {roleLabel}ページ
            </span>
          </div>
          <UserMenu
            name={profile.full_name}
            roleLabel={roleLabel}
            homeHref={home}
            homeLabel="ホームへ"
            logout={logoutAction}
          />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-4">
        <PortalNav items={nav} home={home} />
        <main className="mt-4 pb-16">{children}</main>
      </div>
    </div>
  );
}
