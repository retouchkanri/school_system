import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import AdminSidebar from "@/components/admin/sidebar";
import UserMenu from "@/components/user-menu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/95 px-[5vw] py-4 backdrop-blur lg:px-6">
          <p className="text-base font-semibold text-gray-700 lg:hidden">東関東馬事学院 管理</p>
          <div className="ml-auto">
            <UserMenu
              name={profile.full_name}
              roleLabel="職員"
              homeHref="/admin"
              homeLabel="管理画面トップへ"
              logout={logoutAction}
            />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
