import { ArrowUpRight } from "lucide-react";
import { officialUrl, type OfficialSite } from "@/lib/official-sites";

/**
 * 学院カードに並べる公式サイトの主要ページリンク (primary: true のもの)。
 * リンク先は official-sites.ts の定義に従うため、ここでURLを直書きしない。
 */
export function OfficialLinkChips({ site }: { site: OfficialSite }) {
  const primary = site.links.filter((link) => link.primary);
  return (
    <ul className="flex flex-wrap gap-2">
      {primary.map((link) => (
        <li key={link.path}>
          <a
            href={officialUrl(site, link.path)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors duration-200 hover:border-brand-500 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {link.label}
            <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
