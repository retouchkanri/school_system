import { adminDb } from "@/lib/supabase/admin";
import type { SharedPhoto } from "@/lib/types";
import { PHOTO_BUCKET, PHOTO_URL_TTL } from "./photo-meta";

/**
 * 写真共有機能のサーバー側共通ロジック (管理・生徒・保護者の各ページから利用する)。
 * バケットは非公開のため、閲覧は必ずサーバー側で署名付きURLを発行して渡すこと。
 * 定数・型は ./photo-meta を参照 (クライアントからも読み込むため分離している)。
 */

/** jsonb の files を必ず string[] に正規化する (不正なデータへの防御) */
export function photoPaths(photo: Pick<SharedPhoto, "files">): string[] {
  const raw: unknown = photo.files;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === "string" && p.length > 0);
}

export interface PhotoFileUrl {
  path: string;
  url: string;
  /** ダウンロード時のファイル名 */
  name: string;
}

export interface SharedPhotoWithUrls extends SharedPhoto {
  urls: PhotoFileUrl[];
}

function fileNameOf(path: string): string {
  return path.split("/").pop() || "photo.jpg";
}

/**
 * 複数写真レコードの全ファイルについて署名付きURLをまとめて発行する。
 * 呼び出し側で「閲覧してよいレコードだけ」に絞り込んでから渡すこと。
 */
export async function withSignedUrls(
  photos: SharedPhoto[],
  expiresIn: number = PHOTO_URL_TTL
): Promise<SharedPhotoWithUrls[]> {
  const allPaths = Array.from(new Set(photos.flatMap((p) => photoPaths(p))));
  const urlByPath = new Map<string, string>();

  if (allPaths.length > 0) {
    const { data } = await adminDb().storage.from(PHOTO_BUCKET).createSignedUrls(allPaths, expiresIn);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
  }

  return photos.map((p) => {
    const paths = photoPaths(p);
    return {
      ...p,
      files: paths,
      urls: paths
        .map((path) => {
          const url = urlByPath.get(path);
          return url ? { path, url, name: fileNameOf(path) } : null;
        })
        .filter((u): u is PhotoFileUrl => u !== null),
    };
  });
}

/**
 * 生徒 (または保護者の子) が閲覧できる写真を取得する。
 * 「自分宛 (student_id = 自分) または全体公開 (student_id is null)」かつ
 * 「audience が指定の対象 または both」の条件をサーバー側で必ず適用する。
 */
export async function loadPhotosForStudent(
  studentId: string,
  viewer: "student" | "parent"
): Promise<SharedPhotoWithUrls[]> {
  // .or() は文字列でフィルタを組み立てるため、IDの形式を検証してから使う
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return [];

  const { data } = await adminDb()
    .from("shared_photos")
    .select("*")
    .or(`student_id.eq.${studentId},student_id.is.null`)
    .in("audience", [viewer, "both"])
    .order("created_at", { ascending: false });

  const photos = ((data ?? []) as SharedPhoto[]).filter(
    // 念のためアプリ層でも再検証 (他人宛の写真が絶対に混ざらないようにする)
    (p) => p.student_id === null || p.student_id === studentId
  );
  return withSignedUrls(photos);
}
