import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import AdminSidebar from "@/components/admin/sidebar";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <div className="app-shell flex h-dvh flex-col bg-white">
      <header className="z-40 flex shrink-0 w-full items-stretch border-b border-gray-200 bg-white">
        <SiteLogo variant="brand" href="/" className="shrink-0" />
        <div className="flex flex-1 items-center justify-end px-4 sm:px-6">
          <UserMenu
            name={profile.full_name}
            roleLabel="所有者"
            homeHref="/admin"
            homeLabel="管理画面トップへ"
            logout={logoutAction}
            avatarUrl={profile.avatar_url}
          />
        </div>
      </header>

      {/* 画面幅いっぱいに広げる (max-w で中央寄せしない)。左右それぞれが独立スクロール */}
      <div className="flex min-h-0 flex-1 gap-4 px-4 py-5 sm:gap-6 sm:px-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto pb-6">{children}</main>
      </div>
    </div>
  );
}
