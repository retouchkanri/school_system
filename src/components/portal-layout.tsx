import { logoutAction } from "@/app/login/actions";
import PortalNav, { type PortalNavItem } from "@/components/portal-shell";
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
    <div className="min-h-screen bg-[#f6f7f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex w-full items-center justify-between px-[5vw] py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="馬事学院/東関東馬事専門学院" className="h-8 w-auto" />
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 sm:inline">
              {roleLabel}ページ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">{profile.full_name}</span>
            <form action={logoutAction}>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-4">
        <PortalNav items={nav} home={home} />
        <main className="mt-4 pb-16">{children}</main>
      </div>
    </div>
  );
}
