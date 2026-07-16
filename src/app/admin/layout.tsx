import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import AdminSidebar from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      <AdminSidebar />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/90 px-[5vw] py-3 backdrop-blur lg:px-6">
          <p className="text-sm font-semibold text-gray-700 lg:hidden">東関東馬事学院 管理</p>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile.full_name} <span className="text-xs text-gray-400">(職員)</span>
            </span>
            <form action={logoutAction}>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                ログアウト
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
