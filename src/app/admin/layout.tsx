import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import AdminSidebar from "@/components/admin/sidebar";
import SiteLogo from "@/components/site-logo";
import UserMenu from "@/components/user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 flex w-full items-stretch border-b border-gray-200 bg-white shadow-sm">
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
      <AdminSidebar />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
