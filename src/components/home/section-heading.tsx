import type { ReactNode } from "react";
import Reveal from "@/components/home/reveal";

type SectionHeadingProps = {
  /** 英字ラベル (例: OUR SCHOOLS) */
  eyebrow: string;
  title: ReactNode;
  /** 見出し下のリード文 */
  lead?: ReactNode;
  align?: "center" | "left";
  /** dark: 濃色背景のセクションで使う配色 */
  tone?: "light" | "dark";
  /** 出現アニメーションの向き (Reveal に渡す) */
  variant?: "up" | "left" | "right" | "zoom" | "fade";
  className?: string;
};

/**
 * トップページのセクション見出し。
 * 「英字ラベル → 見出し → リード文」の3点セットで、余白・文字サイズ・下線の出方を
 * 全セクションで揃えるために使う (各セクションで個別に組まないこと)。
 */
export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  tone = "light",
  variant = "up",
  className = "",
}: SectionHeadingProps) {
  const centered = align === "center";
  const dark = tone === "dark";

  return (
    <Reveal variant={variant} className={className}>
      <p
        className={`text-[11px] font-bold tracking-[0.35em] ${dark ? "text-accent-500" : "text-accent-600"} ${
          centered ? "text-center" : ""
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-balance text-2xl font-bold leading-relaxed sm:text-[2rem] ${
          dark ? "text-white" : "text-gray-900"
        } ${centered ? "heading-underline text-center" : ""}`}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={`mt-6 text-pretty text-sm leading-loose ${dark ? "text-brand-100/85" : "text-gray-600"} ${
            centered ? "mx-auto max-w-2xl text-center" : "max-w-xl"
          }`}
        >
          {lead}
        </p>
      )}
    </Reveal>
  );
}
