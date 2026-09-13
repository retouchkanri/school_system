import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";
import { portalNavIcons } from "@/components/nav-icons";
import type { PortalNavItem } from "@/components/portal-shell";

const NAV: PortalNavItem[] = [
  { href: "/student", label: "ホーム", icon: portalNavIcons.home },
  { href: "/student/attendance", label: "出欠", icon: portalNavIcons.attendance },
  { href: "/student/absence", label: "欠席連絡", icon: portalNavIcons.absence },
  { href: "/student/riding", label: "騎乗報告", icon: portalNavIcons.riding },
  { href: "/student/trainings", label: "研修", icon: portalNavIcons.trainings },
  { href: "/student/overnight", label: "外泊届", icon: portalNavIcons.overnight },
  { href: "/student/meals", label: "食事", icon: portalNavIcons.meals },
  { href: "/student/grades", label: "成績表", icon: portalNavIcons.grades },
  { href: "/student/competency", label: "社会人基礎力", icon: portalNavIcons.competency },
  { href: "/student/career", label: "進路", icon: portalNavIcons.career },
  { href: "/student/photos", label: "写真", icon: portalNavIcons.photos },
  { href: "/student/insurance", label: "怪我・保険", icon: portalNavIcons.insurance },
  { href: "/student/tuition", label: "学費", icon: portalNavIcons.tuition },
  { href: "/student/reimbursements", label: "諸経費返金", icon: portalNavIcons.reimbursements },
  { href: "/student/surveys", label: "アンケート", icon: portalNavIcons.surveys },
  { href: "/student/announcements", label: "お知らせ", icon: portalNavIcons.announcements },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  return (
    <PortalLayout profile={profile} roleLabel="在校生" nav={NAV} home="/student">
      {children}
    </PortalLayout>
  );
}
