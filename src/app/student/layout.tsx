import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";

const NAV = [
  { href: "/student", label: "ホーム" },
  { href: "/student/attendance", label: "出欠" },
  { href: "/student/riding", label: "騎乗報告" },
  { href: "/student/trainings", label: "研修" },
  { href: "/student/overnight", label: "外泊届" },
  { href: "/student/meals", label: "食事" },
  { href: "/student/grades", label: "成績表" },
  { href: "/student/competency", label: "社会人基礎力" },
  { href: "/student/career", label: "進路" },
  { href: "/student/reimbursements", label: "諸経費返金" },
  { href: "/student/surveys", label: "アンケート" },
  { href: "/student/announcements", label: "お知らせ" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  return (
    <PortalLayout profile={profile} roleLabel="在校生" nav={NAV} home="/student">
      {children}
    </PortalLayout>
  );
}
