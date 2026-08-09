"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import SideRail from "@/components/side-rail";
import { PROGRESS_GROUPS, PROGRESS_STEPS, statusIndex, completedStepCount } from "@/lib/constants";
import { STEP_ICONS, GROUP_ICONS } from "@/lib/progress-icons";
import type { PortalNavItem } from "@/components/portal-shell";
import type { LeadStatus } from "@/lib/types";

/** パスがそのhrefに属するか (完全一致 or 配下) */
function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 18ステップを5つの引き出しに分けて並べる。
 * 引き出し = PROGRESS_GROUPS (資料請求/事前審査/見学・体験/出願・選考/入学準備)。
 * 初期状態はすべて開いており、18ステップ全体が一度に見渡せる。
 * 見出しをクリックすると個別に折りたためる (中身をファイルのように一覧できる形は保ったまま)。
 */
function ProgressSections({ status }: { status: LeadStatus }) {
  const total = PROGRESS_STEPS.length;
  const done = completedStepCount(status);
  // lead.status は「完了した最新ステップ」を指すため、いま取り組むステップはその次
  const currentIndex = statusIndex(status) + 1;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // 初期状態はすべての章を開いておき、18ステップ全体を一度に見渡せるようにする
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(PROGRESS_GROUPS.map((g) => g.key)));
  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="bg-gradient-to-r from-brand-50/70 to-white px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-gray-800">入学までの進捗</span>
          <span className="text-sm tabular-nums text-gray-500">
            <span className="font-bold text-brand-700">{done}</span> / {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/80">
          <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul>
        {PROGRESS_GROUPS.map((group, gi) => {
          const open = openKeys.has(group.key);
          const groupDone = group.steps.filter((_, j) => group.startIndex + j < currentIndex).length;
          const hasCurrent = currentIndex >= group.startIndex && currentIndex < group.startIndex + group.steps.length;
          const complete = groupDone === group.steps.length;
          const GroupIcon = GROUP_ICONS[group.key];

          return (
            <li key={group.key}>
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={open}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-gray-50 ${
                  hasCurrent ? "bg-brand-50/50" : ""
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    complete
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : hasCurrent
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                  }`}
                >
                  <GroupIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
                  {gi + 1}. {group.label}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                  {groupDone}/{group.steps.length}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {open && (
                <ul className="space-y-1 px-3.5 pb-3 pl-[3rem]">
                  {group.steps.map((step, j) => {
                    const index = group.startIndex + j;
                    const stepDone = index < currentIndex;
                    const stepCurrent = index === currentIndex;
                    const StepIcon = STEP_ICONS[step.key];
                    return (
                      <li key={step.key}>
                        <span
                          aria-current={stepCurrent ? "step" : undefined}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                            stepCurrent
                              ? "bg-brand-50 font-bold text-brand-700 ring-1 ring-inset ring-brand-300"
                              : stepDone
                                ? "bg-gray-50 text-gray-500"
                                : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              stepCurrent
                                ? "bg-brand-600 text-white"
                                : stepDone
                                  ? "bg-brand-100 text-brand-600"
                                  : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {stepDone ? <Check className="h-3 w-3" /> : <StepIcon className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {index + 1}. {step.label}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * ポータル共通の左サイドバー。
 * 上に「入学までの進捗」5セクション (入学希望者のみ)、
 * その下に現在のタブを1つの枠 (ホルダー) にまとめて縦に並べる。
 * モバイルではアイコンだけのレールになり、スワイプで中身が開く (components/side-rail.tsx)。
 */
export default function PortalSidebar({
  nav,
  home,
  status,
}: {
  nav: PortalNavItem[];
  home: string;
  /** 入学希望者のみ指定。渡すと進捗5セクションを表示する */
  status?: LeadStatus;
}) {
  const pathname = usePathname();

  // 最も長く一致した href の項目を選択。どれにも一致しなければホームを選択する
  let activeIndex = -1;
  let bestLength = -1;
  nav.forEach((item, i) => {
    const hrefs = [item.href, ...(item.children?.map((c) => c.href) ?? [])];
    for (const href of hrefs) {
      if (href === home) continue; // ホームは他が一致しなかったときの受け皿
      if (matches(pathname, href) && href.length > bestLength) {
        activeIndex = i;
        bestLength = href.length;
      }
    }
  });
  if (activeIndex < 0) activeIndex = nav.findIndex((i) => i.href === home);

  const railIcons = (
    <>
      {nav.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          aria-current={i === activeIndex ? "page" : undefined}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition ${
            i === activeIndex ? "bg-brand-600 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:text-brand-700"
          }`}
        >
          {item.icon ?? item.label.slice(0, 1)}
        </Link>
      ))}
    </>
  );

  const content = (
    <div className="space-y-3">
      {status && <ProgressSections status={status} />}

      {/* タブのホルダー */}
      <nav className="overflow-hidden rounded-xl bg-white shadow-sm">
        <p className="px-3.5 py-2.5 text-sm font-bold text-gray-800">メニュー</p>
        <ul className="space-y-0.5 px-2 pb-2">
          {nav.map((item, i) => {
            const active = i === activeIndex;
            const subItems = active && item.children && item.children.length > 1 ? item.children : null;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-brand-700"
                  }`}
                >
                  {item.icon}
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>

                {subItems && (
                  <ul className="mt-0.5 space-y-0.5 pl-8">
                    {subItems.map((sub) => {
                      const subActive = matches(pathname, sub.href);
                      return (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            aria-current={subActive ? "page" : undefined}
                            className={`block rounded-lg px-2.5 py-1.5 text-xs transition ${
                              subActive
                                ? "bg-brand-50 font-bold text-brand-700"
                                : "text-gray-500 hover:bg-gray-100 hover:text-brand-700"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return <SideRail railIcons={railIcons}>{content}</SideRail>;
}
