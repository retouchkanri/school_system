"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface PortalNavItem {
  href: string;
  label: string;
}

export default function PortalNav({ items, home }: { items: PortalNavItem[]; home: string }) {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.href === home ? pathname === home : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? "bg-brand-600 text-white shadow-sm" : "bg-white text-gray-600 hover:bg-brand-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
