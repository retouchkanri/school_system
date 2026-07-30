import { Card, EmptyState } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { SharedPhotoWithUrls } from "./shared";

/**
 * 生徒・保護者向けの写真ギャラリー (サーバーコンポーネント)。
 * 写真共有機能の一部としてこのディレクトリにまとめている
 * (Next.js の app ディレクトリでは page/layout/route 以外のファイルはルートにならないため、
 *  /student/photos・/parent/photos から通常のモジュールとして import して利用する)。
 * url は呼び出し側でサーバー側から発行した署名付きURLであること。
 */
export default function PhotoGallery({
  photos,
  emptyMessage = "まだ写真は届いていません",
}: {
  photos: SharedPhotoWithUrls[];
  emptyMessage?: string;
}) {
  if (photos.length === 0) {
    return (
      <Card>
        <EmptyState message={emptyMessage} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {photos.map((photo) => (
        <Card key={photo.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{photo.title}</h3>
              <p className="mt-0.5 text-xs text-gray-400">
                {photo.taken_on ? `撮影日 ${fmtDate(photo.taken_on)}` : `公開 ${fmtDateTime(photo.created_at)}`}
                {" / "}
                {photo.urls.length}枚
              </p>
            </div>
          </div>

          {photo.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{photo.description}</p>
          )}

          {photo.urls.length === 0 ? (
            <p className="mt-3 text-xs text-gray-400">画像を表示できませんでした。時間をおいて再度お試しください。</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photo.urls.map((file, i) => (
                <div key={file.path} className="border border-gray-200 bg-white">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={`${photo.title} ${i + 1}枚目`}
                      className="h-36 w-full object-cover transition hover:opacity-90"
                    />
                  </a>
                  <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-2 py-1.5">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 underline hover:text-gray-800"
                    >
                      拡大
                    </a>
                    <a
                      href={file.url}
                      download={file.name}
                      className="text-xs font-semibold text-brand-700 underline hover:text-brand-800"
                    >
                      ⬇ 保存
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
