"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SideRail from "@/components/side-rail";
import { adminNavIcons, adminSectionIcons } from "@/components/nav-icons";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV: { section: string; icon: React.ReactNode; items: NavItem[] }[] = [
  {
    section: "全体",
    icon: adminSectionIcons.overview,
    items: [{ href: "/admin", label: "ダッシュボード", icon: adminNavIcons.dashboard }],
  },
  {
    section: "入学管理",
    icon: adminSectionIcons.admission,
    items: [
      { href: "/admin/leads", label: "リード(見込み客)", icon: adminNavIcons.leads },
      { href: "/admin/follow-ups", label: "フォロー対象", icon: adminNavIcons.followUps },
      { href: "/admin/events", label: "見学・オープンキャンパス", icon: adminNavIcons.events },
      { href: "/admin/applications", label: "出願・適性検査", icon: adminNavIcons.applications },
      { href: "/admin/decisions", label: "合否管理", icon: adminNavIcons.decisions },
      { href: "/admin/enrollments", label: "入学手続き", icon: adminNavIcons.enrollments },
      { href: "/admin/payments", label: "入金管理", icon: adminNavIcons.payments },
    ],
  },
  {
    section: "在校生管理",
    icon: adminSectionIcons.students,
    items: [
      { href: "/admin/students", label: "生徒一覧", icon: adminNavIcons.students },
      { href: "/admin/attendance", label: "出欠管理", icon: adminNavIcons.attendance },
      { href: "/admin/absences", label: "欠席・遅刻連絡", icon: adminNavIcons.absences },
      { href: "/admin/meals", label: "食事管理", icon: adminNavIcons.meals },
      { href: "/admin/riding-reports", label: "騎乗報告(日報)", icon: adminNavIcons.riding },
      { href: "/admin/trainings", label: "研修管理", icon: adminNavIcons.trainings },
      { href: "/admin/overnight", label: "外泊届", icon: adminNavIcons.overnight },
      { href: "/admin/surveys", label: "定期アンケート", icon: adminNavIcons.surveys },
      { href: "/admin/grades", label: "成績管理", icon: adminNavIcons.grades },
      { href: "/admin/competency", label: "社会人基礎力評価", icon: adminNavIcons.competency },
      { href: "/admin/injuries", label: "怪我・保険申請", icon: adminNavIcons.injuries },
      { href: "/admin/photos", label: "写真共有", icon: adminNavIcons.photos },
    ],
  },
  {
    section: "進路・経費",
    icon: adminSectionIcons.finance,
    items: [
      { href: "/admin/tuition", label: "学費・納付管理", icon: adminNavIcons.tuition },
      { href: "/admin/career", label: "進路管理", icon: adminNavIcons.career },
      { href: "/admin/reimbursements", label: "諸経費精算", icon: adminNavIcons.reimbursements },
    ],
  },
  {
    section: "馬管理",
    icon: adminSectionIcons.horses,
    items: [
      { href: "/admin/horses", label: "馬一覧", icon: adminNavIcons.horses },
      { href: "/admin/retouch", label: "リタッチ馬 月次報告", icon: adminNavIcons.retouch },
    ],
  },
  {
    section: "配信",
    icon: adminSectionIcons.broadcast,
    items: [
      { href: "/admin/announcements", label: "お知らせ配信", icon: adminNavIcons.announcements },
      { href: "/admin/messages", label: "一斉メール・LINE", icon: adminNavIcons.messages },
      { href: "/admin/notifications", label: "送信ログ", icon: adminNavIcons.notifications },
    ],
  },
  {
    section: "システム管理",
    icon: adminSectionIcons.system,
    items: [{ href: "/admin/users", label: "ユーザー管理", icon: adminNavIcons.users }],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

const linkBase =
  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition";
const linkActive = "bg-brand-600 font-bold text-white shadow-sm [&_svg]:text-white";
const linkIdle = "text-gray-600 hover:bg-gray-100 hover:text-brand-700";

/**
 * 管理画面の左サイドバー。ポータル (components/portal-sidebar.tsx) と同じ作りにそろえている。
 * モバイルではセクションのアイコンだけのレールになり、スワイプで中身が開く。
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  const railIcons = (
    <>
      {NAV.map((group) => {
        const active = group.items.some((item) => isActive(pathname, item.href));
        return (
          <Link
            key={group.section}
            href={group.items[0].href}
            aria-label={group.section}
            title={group.section}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
              active
                ? "bg-brand-600 text-white shadow-sm [&_svg]:text-white"
                : "bg-white text-gray-500 shadow-sm hover:bg-brand-50"
            }`}
          >
            {group.icon}
          </Link>
        );
      })}
    </>
  );

  const content = (
    <nav className="overflow-hidden rounded-xl bg-white shadow-sm">
      {NAV.map((group) => (
        <div key={group.section} className="px-2 pt-2.5 pb-1 first:pt-2">
          <p className="flex items-center gap-2 px-1.5 pb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
            {group.icon}
            {group.section}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${linkBase} ${active ? linkActive : linkIdle}`}
                  >
                    {item.icon}
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return <SideRail railIcons={railIcons} label="管理メニュー">{content}</SideRail>;
}
