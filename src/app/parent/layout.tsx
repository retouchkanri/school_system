import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";

const NAV = [
  { href: "/parent", label: "ホーム" },
  { href: "/parent/overnight", label: "外泊承認" },
  { href: "/parent/attendance", label: "出欠" },
  { href: "/parent/meals", label: "食事" },
  { href: "/parent/grades", label: "成績表" },
  { href: "/parent/competency", label: "社会人基礎力" },
  { href: "/parent/career", label: "進路" },
  { href: "/parent/reimbursements", label: "諸経費返金" },
  { href: "/parent/announcements", label: "お知らせ" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("parent");
  return (
    <PortalLayout profile={profile} roleLabel="保護者" nav={NAV} home="/parent">
      {children}
    </PortalLayout>
  );
}
