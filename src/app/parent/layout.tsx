import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";
import { portalNavIcons } from "@/components/nav-icons";
import type { PortalNavItem } from "@/components/portal-shell";

const NAV: PortalNavItem[] = [
  { href: "/parent", label: "ホーム", icon: portalNavIcons.home },
  { href: "/parent/overnight", label: "外泊承認", icon: portalNavIcons.overnight },
  { href: "/parent/attendance", label: "出欠", icon: portalNavIcons.attendance },
  { href: "/parent/absence", label: "欠席連絡", icon: portalNavIcons.absence },
  { href: "/parent/meals", label: "食事", icon: portalNavIcons.meals },
  { href: "/parent/grades", label: "成績表", icon: portalNavIcons.grades },
  { href: "/parent/competency", label: "社会人基礎力", icon: portalNavIcons.competency },
  { href: "/parent/career", label: "進路", icon: portalNavIcons.career },
  { href: "/parent/photos", label: "写真", icon: portalNavIcons.photos },
  { href: "/parent/insurance", label: "怪我・保険", icon: portalNavIcons.insurance },
  { href: "/parent/tuition", label: "学費", icon: portalNavIcons.tuition },
  { href: "/parent/reimbursements", label: "諸経費返金", icon: portalNavIcons.reimbursements },
  { href: "/parent/announcements", label: "お知らせ", icon: portalNavIcons.announcements },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("parent");
  return (
    <PortalLayout profile={profile} roleLabel="保護者" nav={NAV} home="/parent">
      {children}
    </PortalLayout>
  );
}
