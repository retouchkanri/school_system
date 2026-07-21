type MarqueeItem = { src: string; alt: string; caption?: string };

/**
 * 写真が横に流れ続けるマーキー。CSS アニメーションのみで動作。
 * ホバーで一時停止。リストを2周分並べて -50% まで移動しループさせる。
 */
export default function PhotoMarquee({ items, className = "" }: { items: MarqueeItem[]; className?: string }) {
  const doubled = [...items, ...items];
  return (
    <div className={`group relative w-full overflow-hidden ${className}`}>
      <div className="animate-marquee flex w-max gap-5">
        {doubled.map((item, i) => (
          <figure
            key={`${item.src}-${i}`}
            className="img-zoom relative w-56 shrink-0 overflow-hidden rounded-xl shadow-md sm:w-64"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} className="h-40 w-full object-cover sm:h-44" loading="lazy" />
            {item.caption && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-bold text-white">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      {/* 両端をふわっとフェード */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
