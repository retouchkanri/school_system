import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";
import { supporterNavIcons } from "@/components/nav-icons";
import type { PortalNavItem } from "@/components/portal-shell";

const NAV: PortalNavItem[] = [
  { href: "/supporter", label: "月次報告", icon: supporterNavIcons.reports },
  { href: "/supporter/announcements", label: "お知らせ", icon: supporterNavIcons.announcements },
];

export default async function SupporterLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("supporter");
  return (
    <PortalLayout profile={profile} roleLabel="一口支援者" nav={NAV} home="/supporter">
      {children}
    </PortalLayout>
  );
}
