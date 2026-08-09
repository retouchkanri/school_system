"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Wallet,
  PawPrint,
  Megaphone,
  Settings,
} from "lucide-react";
import SideRail from "@/components/side-rail";

const ICON = "h-4 w-4";

const NAV: { section: string; icon: React.ReactNode; items: { href: string; label: string }[] }[] = [
  {
    section: "全体",
    icon: <LayoutDashboard className={ICON} />,
    items: [{ href: "/admin", label: "ダッシュボード" }],
  },
  {
    section: "入学管理",
    icon: <UserPlus className={ICON} />,
    items: [
      { href: "/admin/leads", label: "リード(見込み客)" },
      { href: "/admin/follow-ups", label: "フォロー対象" },
      { href: "/admin/events", label: "見学・オープンキャンパス" },
      { href: "/admin/applications", label: "出願・適性検査" },
      { href: "/admin/decisions", label: "合否管理" },
      { href: "/admin/enrollments", label: "入学手続き" },
      { href: "/admin/payments", label: "入金管理" },
    ],
  },
  {
    section: "在校生管理",
    icon: <Users className={ICON} />,
    items: [
      { href: "/admin/students", label: "生徒一覧" },
      { href: "/admin/attendance", label: "出欠管理" },
      { href: "/admin/absences", label: "欠席・遅刻連絡" },
      { href: "/admin/meals", label: "食事管理" },
      { href: "/admin/riding-reports", label: "騎乗報告(日報)" },
      { href: "/admin/trainings", label: "研修管理" },
      { href: "/admin/overnight", label: "外泊届" },
      { href: "/admin/surveys", label: "定期アンケート" },
      { href: "/admin/grades", label: "成績管理" },
      { href: "/admin/competency", label: "社会人基礎力評価" },
      { href: "/admin/injuries", label: "怪我・保険申請" },
      { href: "/admin/photos", label: "写真共有" },
    ],
  },
  {
    section: "進路・経費",
    icon: <Wallet className={ICON} />,
    items: [
      { href: "/admin/tuition", label: "学費・納付管理" },
      { href: "/admin/career", label: "進路管理" },
      { href: "/admin/reimbursements", label: "諸経費精算" },
    ],
  },
  {
    section: "馬管理",
    icon: <PawPrint className={ICON} />,
    items: [
      { href: "/admin/horses", label: "馬一覧" },
      { href: "/admin/retouch", label: "リタッチ馬 月次報告" },
    ],
  },
  {
    section: "配信",
    icon: <Megaphone className={ICON} />,
    items: [
      { href: "/admin/announcements", label: "お知らせ配信" },
      { href: "/admin/messages", label: "一斉メール・LINE" },
      { href: "/admin/notifications", label: "送信ログ" },
    ],
  },
  {
    section: "システム管理",
    icon: <Settings className={ICON} />,
    items: [{ href: "/admin/users", label: "ユーザー管理" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

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
              active ? "bg-brand-600 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:text-brand-700"
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
                    className={`block rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-brand-600 font-bold text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-brand-700"
                    }`}
                  >
                    {item.label}
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
