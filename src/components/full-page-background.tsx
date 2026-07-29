/**
 * ページ全体を覆うフルページ背景写真。
 * position:fixed でビューポートいっぱいに敷き、白いグラデーション幕(scrim)を重ねて
 * 前面のカード・文字が常に読みやすい状態を保つ。z-index は最背面(-10)。
 */
export default function FullPageBackground({
  src,
  alt = "",
  tone = "brand",
}: {
  src: string;
  alt?: string;
  /** brand: ブランドグリーンがかった幕 / neutral: ニュートラルな白の幕 */
  tone?: "brand" | "neutral";
}) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden={alt ? undefined : true} role={alt ? "img" : undefined} aria-label={alt || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <div
        className={
          tone === "brand"
            ? "absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-brand-50/90"
            : "absolute inset-0 bg-gradient-to-b from-white/94 via-white/88 to-white/92"
        }
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40" />
    </div>
  );
}
