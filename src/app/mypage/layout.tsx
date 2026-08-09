import { Compass, PlayCircle, CalendarDays, ClipboardCheck, Package } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { statusIndex } from "@/lib/constants";
import PortalLayout from "@/components/portal-layout";
import type { PortalNavItem } from "@/components/portal-shell";

/**
 * 入学までの行程を4つの章にまとめ、サイドバーのメニューを「進捗 + 4章」の5つに抑える。
 * 章の中の個別ページは、その章を開いている間だけサブ項目として表示される。
 * アイコンはモバイルのアイコンレールでも使うため、全項目に指定する。
 */
const ICON_CLS = "h-4 w-4";

const NAV: PortalNavItem[] = [
  { href: "/mypage", label: "進捗", icon: <Compass className={ICON_CLS} /> },
  {
    href: "/mypage/video",
    label: "事前審査",
    icon: <PlayCircle className={ICON_CLS} />,
    children: [
      { href: "/mypage/video", label: "紹介動画" },
      { href: "/mypage/survey", label: "仮審査" },
    ],
  },
  {
    href: "/mypage/events",
    label: "見学・体験",
    icon: <CalendarDays className={ICON_CLS} />,
    children: [
      { href: "/mypage/events", label: "見学予約" },
      { href: "/mypage/experience", label: "体験アンケート" },
    ],
  },
  {
    href: "/mypage/application",
    label: "出願・選考",
    icon: <ClipboardCheck className={ICON_CLS} />,
    children: [
      { href: "/mypage/application", label: "出願" },
      { href: "/mypage/aptitude", label: "適性検査" },
      { href: "/mypage/result", label: "合否" },
    ],
  },
  {
    href: "/mypage/enrollment",
    label: "入学準備",
    icon: <Package className={ICON_CLS} />,
    children: [{ href: "/mypage/enrollment", label: "入学手続き" }],
  },
];

/** 入学者専用ページは合否通知後にのみタブへ現れる (それ以前は開いても何も無いため) */
const ENROLLEE_TAB = { href: "/mypage/enrollee", label: "入学者専用" };
const ENROLLEE_VISIBLE_FROM = statusIndex("decision_sent");

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  let nav = NAV;

  if (lead && statusIndex(lead.status) >= ENROLLEE_VISIBLE_FROM) {
    nav = NAV.map((item) =>
      item.href === "/mypage/enrollment"
        ? { ...item, children: [...(item.children ?? []), ENROLLEE_TAB] }
        : item
    );
  }

  return (
    <PortalLayout
      profile={profile}
      roleLabel="入学希望者マイ"
      nav={nav}
      home="/mypage"
      statusHref="/mypage/status"
      status={lead?.status}
    >
      {children}
    </PortalLayout>
  );
}
