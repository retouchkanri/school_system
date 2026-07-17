import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import AdminSidebar from "@/components/admin/sidebar";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";

/** 管理者アカウントのプロフィール写真 (メールアドレスで紐付け) */
const ADMIN_AVATARS: Record<string, string> = {
  "admin@bajigakuin.jp": "/images/admin_avatar.jpg",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/admin" className="shrink-0">
          <SiteLogo height={44} />
        </Link>
        <UserMenu
          name={profile.full_name}
          roleLabel="職員"
          homeHref="/admin"
          homeLabel="管理画面トップへ"
          logout={logoutAction}
          avatarUrl={profile.email ? ADMIN_AVATARS[profile.email] : undefined}
        />
      </header>
      <AdminSidebar />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
