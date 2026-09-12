import Link from "next/link";

type SiteLogoProps = {
  className?: string;
  height?: number;
  /** ロゴのリンク先。未指定時はトップページへ */
  href?: string;
  /**
   * brand: ヘッダー左のブランド帯向け (ロゴ画像を上下余白なしで配置)
   * mark: エンブレム画像のみ
   * full: 横長ロゴ画像 (既定)
   */
  variant?: "full" | "mark" | "brand";
};

/**
 * サイト共通ロゴ。brand バリアントはヘッダー左のブランド帯で使用。
 *
 * img には suppressHydrationWarning を付けている。
 * 広告ブロッカー等の拡張機能が React のハイドレーション前に data-* や
 * style="visibility:hidden" を注入することがあり、そのままだと
 * 「server rendered HTML didn't match the client」の警告が全ページで出るため。
 * (属性の不一致のみを抑制するもので、描画内容には影響しない)
 */
export default function SiteLogo({
  className = "",
  height = 56,
  href = "/",
  variant = "full",
}: SiteLogoProps) {
  if (variant === "brand") {
    return (
      <Link
        href={href}
        className={`box-border flex h-[58px] items-stretch pl-[5vw] pb-1.5 transition sm:h-[72px] sm:pb-2 ${className}`}
        aria-label="トップページへ"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="東関東馬事高等学院・東関東馬事専門学院 入学管理システム"
          className="h-full w-auto max-w-[min(46vw,432px)] object-contain object-left sm:max-w-[min(70vw,432px)]"
          suppressHydrationWarning
        />
      </Link>
    );
  }

  const src = variant === "mark" ? "/images/pubicon.png" : "/images/logo.png";
  const alt = variant === "mark" ? "東関東馬事学院" : "馬事学院／東関東馬事専門学院";

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="トップページへ">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-auto max-w-full object-contain"
        style={{ height }}
        suppressHydrationWarning
      />
    </Link>
  );
}
