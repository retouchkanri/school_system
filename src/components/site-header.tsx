import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { getSessionProfile, roleHome } from "@/lib/auth";
import SiteLogo from "@/components/site-logo";
import { btnPrimary, btnSecondary } from "@/components/ui";
import MobileNav from "@/components/mobile-nav";
import UserMenu from "@/components/user-menu";
import HeaderActions from "@/components/header-actions";
import { OFFICIAL_SITES, OFFICIAL_SITE_LIST, officialUrl } from "@/lib/official-sites";
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

/** 代表電話 (両学院で共通) */
const TEL = OFFICIAL_SITES.koutou.tel;

/**
 * モバイルのハンバーガーメニュー。
 * 通常のナビに加えて、2つの学院の公式サイトへのリンクも入れる
 * (デスクトップでは上部のユーティリティバーに出している)。
 */
const MOBILE_NAV = [
  ...PUBLIC_NAV,
  ...OFFICIAL_SITE_LIST.map((site) => ({
    href: officialUrl(site),
    label: `${site.name} 公式サイト`,
    className:
      "inline-flex items-center justify-between gap-1.5 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-600 transition-colors duration-200 hover:text-brand-700",
    external: true,
  })),
];

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
      {/* 上部ユーティリティバー: ふたつの学院の公式サイトと代表電話への導線 (デスクトップのみ) */}
      <div className="hidden border-b border-gray-100 bg-brand-50/70 sm:block">
        <div className="flex items-center justify-end gap-6 py-1.5 pl-[5vw] pr-[calc(5vw_+_4rem)] text-[11px]">
          <span className="font-bold tracking-[0.25em] text-gray-400">OFFICIAL SITES</span>
          {OFFICIAL_SITE_LIST.map((site) => (
            <a
              key={site.key}
              href={officialUrl(site)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-gray-600 transition-colors duration-200 hover:text-brand-700"
            >
              {site.name}
              <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
          ))}
          <a
            href={`tel:${TEL.replaceAll("-", "")}`}
            className="inline-flex items-center gap-1 font-semibold text-gray-600 transition-colors duration-200 hover:text-brand-700"
          >
            <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
            {TEL}
          </a>
        </div>
      </div>

      <div className="flex w-full items-stretch">
        <SiteLogo variant="brand" href="/" className="shrink-0" />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 pl-2 pr-[4vw] sm:gap-5 sm:pl-6 sm:pr-[calc(5vw_+_4rem)]">
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
                <MobileNav items={MOBILE_NAV} />
              </>
            ))}
        </div>
      </div>
    </header>
  );
}
