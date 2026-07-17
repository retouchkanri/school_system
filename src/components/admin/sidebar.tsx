"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { section: string; items: { href: string; label: string }[] }[] = [
  {
    section: "全体",
    items: [{ href: "/admin", label: "ダッシュボード" }],
  },
  {
    section: "入学管理",
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
    items: [
      { href: "/admin/students", label: "生徒一覧" },
      { href: "/admin/attendance", label: "出欠管理" },
      { href: "/admin/meals", label: "食事管理" },
      { href: "/admin/riding-reports", label: "騎乗報告(日報)" },
      { href: "/admin/trainings", label: "研修管理" },
      { href: "/admin/overnight", label: "外泊届" },
      { href: "/admin/surveys", label: "定期アンケート" },
    ],
  },
  {
    section: "馬管理",
    items: [
      { href: "/admin/horses", label: "馬一覧" },
      { href: "/admin/retouch", label: "リタッチ馬 月次報告" },
    ],
  },
  {
    section: "配信",
    items: [
      { href: "/admin/announcements", label: "お知らせ配信" },
      { href: "/admin/messages", label: "一斉メール・LINE" },
      { href: "/admin/notifications", label: "送信ログ" },
    ],
  },
  {
    section: "システム管理",
    items: [{ href: "/admin/users", label: "ユーザー管理" }],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed top-[4.25rem] bottom-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-gray-200 bg-white lg:flex">
      <nav className="flex-1 space-y-5 px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                        active
                          ? "bg-brand-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-brand-50 hover:text-brand-700"
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
    </aside>
  );
}
