"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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

function sectionHasActive(group: (typeof NAV)[number], pathname: string): boolean {
  return group.items.some((item) => isActive(pathname, item.href));
}

function initialOpenSections(pathname: string): Set<string> {
  const open = new Set<string>();
  for (const group of NAV) {
    if (sectionHasActive(group, pathname)) open.add(group.section);
  }
  // どのグループにも属さない場合は先頭を開く
  if (open.size === 0 && NAV[0]) open.add(NAV[0].section);
  return open;
}

const linkBase =
  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition";
const linkActive = "bg-brand-600 font-bold text-white shadow-sm [&_svg]:text-white";
const linkIdle = "text-gray-600 hover:bg-gray-100 hover:text-brand-700";

/**
 * 管理画面の左サイドバー。ポータル (components/portal-sidebar.tsx) と同じ作りにそろえている。
 * セクション見出しをクリックするとグループ単位で開閉できる。
 * 現在ページを含むグループは自動的に開く。
 * モバイルではセクションのアイコンだけのレールになり、スワイプで中身が開く。
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(() => initialOpenSections(pathname));

  // 遷移先のグループは必ず開く (他グループの開閉状態は維持)
  useEffect(() => {
    setOpenSections((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const group of NAV) {
        if (sectionHasActive(group, pathname) && !next.has(group.section)) {
          next.add(group.section);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  function toggleSection(section: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  const railIcons = (
    <>
      {NAV.map((group) => {
        const active = sectionHasActive(group, pathname);
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
    // admin-compact: globals.css で文字サイズを一段小さくしている (ダッシュボード本文とそろえる)
    <nav className="admin-compact overflow-hidden rounded-xl bg-white shadow-sm">
      {NAV.map((group) => {
        // 項目が1つだけのグループは折りたたみ見出しを出さず、そのリンクを直置きする
        if (group.items.length === 1) {
          const item = group.items[0];
          const active = isActive(pathname, item.href);
          return (
            <div key={group.section} className="border-b border-gray-50 px-2 py-1 last:border-b-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${linkBase} ${active ? linkActive : linkIdle}`}
              >
                {item.icon}
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            </div>
          );
        }

        const open = openSections.has(group.section);
        const groupActive = sectionHasActive(group, pathname);
        const panelId = `admin-nav-${group.section}`;

        return (
          <div key={group.section} className="border-b border-gray-50 px-2 py-1 last:border-b-0">
            <button
              type="button"
              onClick={() => toggleSection(group.section)}
              aria-expanded={open}
              aria-controls={panelId}
              className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-gray-50 ${
                groupActive ? "text-brand-700" : "text-gray-500"
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
                {group.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-wide">{group.section}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-gray-400">{group.items.length}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {open && (
              <ul id={panelId} className="ml-3 space-y-0.5 border-l border-gray-100 pb-1.5 pl-2.5 pt-0.5">
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
            )}
          </div>
        );
      })}
    </nav>
  );

  return <SideRail railIcons={railIcons} label="管理メニュー">{content}</SideRail>;
}
