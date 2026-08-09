import {
  Home,
  CalendarCheck,
  CalendarX,
  ClipboardList,
  GraduationCap,
  BedDouble,
  UtensilsCrossed,
  FileBarChart,
  Sparkles,
  Compass,
  Images,
  HeartPulse,
  Wallet,
  Receipt,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";
import type { PortalNavItem } from "@/components/portal-shell";

const ICON = "h-4 w-4";

const NAV: PortalNavItem[] = [
  { href: "/student", label: "ホーム", icon: <Home className={ICON} /> },
  { href: "/student/attendance", label: "出欠", icon: <CalendarCheck className={ICON} /> },
  { href: "/student/absence", label: "欠席連絡", icon: <CalendarX className={ICON} /> },
  { href: "/student/riding", label: "騎乗報告", icon: <ClipboardList className={ICON} /> },
  { href: "/student/trainings", label: "研修", icon: <GraduationCap className={ICON} /> },
  { href: "/student/overnight", label: "外泊届", icon: <BedDouble className={ICON} /> },
  { href: "/student/meals", label: "食事", icon: <UtensilsCrossed className={ICON} /> },
  { href: "/student/grades", label: "成績表", icon: <FileBarChart className={ICON} /> },
  { href: "/student/competency", label: "社会人基礎力", icon: <Sparkles className={ICON} /> },
  { href: "/student/career", label: "進路", icon: <Compass className={ICON} /> },
  { href: "/student/photos", label: "写真", icon: <Images className={ICON} /> },
  { href: "/student/insurance", label: "怪我・保険", icon: <HeartPulse className={ICON} /> },
  { href: "/student/tuition", label: "学費", icon: <Wallet className={ICON} /> },
  { href: "/student/reimbursements", label: "諸経費返金", icon: <Receipt className={ICON} /> },
  { href: "/student/surveys", label: "アンケート", icon: <MessageSquare className={ICON} /> },
  { href: "/student/announcements", label: "お知らせ", icon: <Megaphone className={ICON} /> },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  return (
    <PortalLayout profile={profile} roleLabel="在校生" nav={NAV} home="/student">
      {children}
    </PortalLayout>
  );
}
