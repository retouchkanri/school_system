/**
 * 入学までの進捗バー。
 * モバイルではタブが画面幅に収まりきらないため、「今どこにいるか」を
 * タブとは独立して常に1行で示す (ナビの現在地表示を補う役割)。
 * 現在地には三角のマーカーを立て、吹き出しでステップ名を表示する。
 */
export default function PortalProgress({
  current,
  total,
  label,
}: {
  /** 完了済みステップ数 */
  current: number;
  /** 全ステップ数 */
  total: number;
  /** 現在のステップ名 */
  label: string;
}) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  // 吹き出し/三角マーカーが左右の端で見切れないよう位置を軽くクランプする
  const markerLeft = Math.min(94, Math.max(6, percent));

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-50/80 via-white/60 to-accent-50/60 px-4 pb-4 pt-10 sm:px-6">
      <div className="relative">
        {/* 現在地の吹き出し + 三角マーカー */}
        <div
          className="absolute bottom-full mb-2 -translate-x-1/2 transition-all duration-500"
          style={{ left: `${markerLeft}%` }}
        >
          <span className="block whitespace-nowrap rounded-full bg-brand-700 px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            現在地: {label}
          </span>
          <span
            className="mx-auto -mt-px block h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-brand-700"
            aria-hidden
          />
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold text-gray-500">入学までの進捗</p>
          <p className="shrink-0 text-xs font-bold tabular-nums text-brand-700">
            {current} <span className="text-gray-400">/ {total} 完了</span>
          </p>
        </div>

        <div
          className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-white/90 ring-1 ring-inset ring-gray-200"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`入学までの進捗 ${current} / ${total} (${label})`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
