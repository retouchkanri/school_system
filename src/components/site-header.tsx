import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { getSessionProfile, roleHome } from "@/lib/auth";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";
import { btnPrimary, btnSecondary } from "@/components/ui";
import type { UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "職員",
  applicant: "入学希望者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
};

type SiteHeaderProps = {
  /** ログイン・資料請求ボタンを表示するか（公開ページ向け） */
  showNav?: boolean;
};

/** 全公開ページ共通のサイトヘッダー。ログイン中はセッションを維持したままユーザーメニューを表示 */
export default async function SiteHeader({ showNav = true }: SiteHeaderProps) {
  const profile = showNav ? await getSessionProfile() : null;

  return (
    <header className="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 bg-white/95 py-4 pl-[5vw] pr-[calc(5vw_+_4rem)] backdrop-blur sm:py-5">
      {/* pr は右端固定の LINE/お問い合わせフローティングボタン(w-12 + pr-2)と重ならないよう余白を確保 */}
      <SiteLogo href="/" />
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
          <nav className="flex items-center gap-3">
            <Link href="/login" className={btnSecondary}>
              ログイン
            </Link>
            <Link href="/request" className={btnPrimary}>
              資料請求
            </Link>
          </nav>
        ))}
    </header>
  );
}
