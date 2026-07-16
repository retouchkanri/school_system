import { requireRole } from "@/lib/auth";
import PortalLayout from "@/components/portal-layout";

const NAV = [
  { href: "/mypage", label: "進捗" },
  { href: "/mypage/video", label: "紹介動画" },
  { href: "/mypage/survey", label: "仮審査" },
  { href: "/mypage/events", label: "見学予約" },
  { href: "/mypage/experience", label: "体験アンケート" },
  { href: "/mypage/application", label: "出願" },
  { href: "/mypage/aptitude", label: "適性検査" },
  { href: "/mypage/result", label: "合否" },
  { href: "/mypage/enrollment", label: "入学手続き" },
  { href: "/mypage/enrollee", label: "入学者専用" },
];

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("applicant");
  return (
    <PortalLayout profile={profile} roleLabel="入学希望者マイ" nav={NAV} home="/mypage">
      {children}
    </PortalLayout>
  );
}
