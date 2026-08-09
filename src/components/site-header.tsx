import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { getSessionProfile, roleHome } from "@/lib/auth";
import SiteLogo from "@/components/site-logo";
import { btnPrimary, btnSecondary } from "@/components/ui";
import MobileNav from "@/components/mobile-nav";
import UserMenu from "@/components/user-menu";
import HeaderActions from "@/components/header-actions";
import type { UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "職員",
  applicant: "入学希望者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
};

const PUBLIC_NAV = [
  { href: "/request", label: "資料請求", className: btnPrimary },
  { href: "/login", label: "ログイン", className: btnSecondary },
] as const;

type SiteHeaderProps = {
  /** ログイン・資料請求ボタンを表示するか（公開ページ向け） */
  showNav?: boolean;
};

/**
 * 公開ページ共通ヘッダー。
 * 左にブランド帯(大きいエンブレム+校名)、右に白地のナビ — 創進学園高等学校ヘッダーに近い構成。
 */
export default async function SiteHeader({ showNav = true }: SiteHeaderProps) {
  const profile = showNav ? await getSessionProfile() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex w-full items-stretch">
        <SiteLogo variant="brand" href="/" className="shrink-0" />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 pl-3 pr-[calc(5vw_+_4rem)] sm:gap-5 sm:pl-6">
          <HeaderActions />
          {showNav &&
            (profile ? (
              <UserMenu
                name={profile.full_name}
                roleLabel={ROLE_LABELS[profile.role]}
                homeHref={roleHome(profile.role)}
                homeLabel="マイページ"
                logout={logoutAction}
                avatarUrl={profile.avatar_url}
              />
            ) : (
              <>
                <nav className="hidden items-center justify-end gap-2 sm:flex sm:gap-3">
                  {PUBLIC_NAV.map((item) => (
                    <Link key={item.href} href={item.href} className={item.className}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <MobileNav items={PUBLIC_NAV} />
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
