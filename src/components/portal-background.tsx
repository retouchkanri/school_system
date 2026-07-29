"use client";

import { usePathname } from "next/navigation";
import { getPortalBackground } from "@/lib/portal-backgrounds";
import FullPageBackground from "@/components/full-page-background";

/** ポータル配下(マイページ/在校生/保護者/支援者)で、現在のタブに応じた背景写真を自動選択して表示 */
export default function PortalBackground() {
  const pathname = usePathname();
  const bg = getPortalBackground(pathname);
  return <FullPageBackground src={bg.src} alt={bg.alt} tone="brand" />;
}
