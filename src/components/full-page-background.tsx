/**
 * ページ全体を覆うフルページ背景写真。
 * position:fixed でビューポートいっぱいに敷き、白いグラデーション幕(scrim)を重ねて
 * 前面のカード・文字が常に読みやすい状態を保つ。z-index は最背面(-10)。
 *
 * <img> ではなく CSS background-image を使うことで、広告ブロッカー等が
 * 属性を注入して発生する hydration mismatch を避ける。
 */
export default function FullPageBackground({
  src,
  alt = "",
  tone = "brand",
}: {
  src: string;
  alt?: string;
  /**
   * brand: ブランドグリーンがかった幕
   * neutral: ニュートラルな白の幕
   * soft: やや薄めの白幕で写真のシャープさを保ちつつ入力欄の視認性を確保
   * clear: 白幕なし（写真をそのまま表示）
   */
  tone?: "brand" | "neutral" | "soft" | "clear";
}) {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${src})` }}
      />
      {tone !== "clear" && (
        <>
          <div
            className={
              tone === "brand"
                ? "absolute inset-0 bg-gradient-to-b from-white/92 via-white/85 to-brand-50/90"
                : tone === "soft"
                  ? "absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/72"
                  : "absolute inset-0 bg-gradient-to-b from-white/94 via-white/88 to-white/92"
            }
          />
          <div
            className={
              tone === "soft"
                ? "absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30"
                : "absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40"
            }
          />
        </>
      )}
    </div>
  );
}
