import Link from "next/link";

type SiteLogoProps = {
  className?: string;
  height?: number;
  /** ロゴのリンク先。未指定時はトップページへ */
  href?: string;
};

export default function SiteLogo({ className = "", height = 40, href = "/" }: SiteLogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="トップページへ">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="馬事学院／東関東馬事専門学院"
        className="w-auto max-w-full object-contain"
        style={{ height }}
      />
    </Link>
  );
}
