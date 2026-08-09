import {
  Home,
  BedDouble,
  CalendarCheck,
  CalendarX,
  UtensilsCrossed,
  FileBarChart,
  Sparkles,
  Compass,
  Images,
  HeartPulse,
  Wallet,
  Receipt,
  Megaphone,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";
import type { PortalNavItem } from "@/components/portal-shell";

const ICON = "h-4 w-4";

const NAV: PortalNavItem[] = [
  { href: "/parent", label: "ホーム", icon: <Home className={ICON} /> },
  { href: "/parent/overnight", label: "外泊承認", icon: <BedDouble className={ICON} /> },
  { href: "/parent/attendance", label: "出欠", icon: <CalendarCheck className={ICON} /> },
  { href: "/parent/absence", label: "欠席連絡", icon: <CalendarX className={ICON} /> },
  { href: "/parent/meals", label: "食事", icon: <UtensilsCrossed className={ICON} /> },
  { href: "/parent/grades", label: "成績表", icon: <FileBarChart className={ICON} /> },
  { href: "/parent/competency", label: "社会人基礎力", icon: <Sparkles className={ICON} /> },
  { href: "/parent/career", label: "進路", icon: <Compass className={ICON} /> },
  { href: "/parent/photos", label: "写真", icon: <Images className={ICON} /> },
  { href: "/parent/insurance", label: "怪我・保険", icon: <HeartPulse className={ICON} /> },
  { href: "/parent/tuition", label: "学費", icon: <Wallet className={ICON} /> },
  { href: "/parent/reimbursements", label: "諸経費返金", icon: <Receipt className={ICON} /> },
  { href: "/parent/announcements", label: "お知らせ", icon: <Megaphone className={ICON} /> },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("parent");
  return (
    <PortalLayout profile={profile} roleLabel="保護者" nav={NAV} home="/parent">
      {children}
    </PortalLayout>
  );
}
