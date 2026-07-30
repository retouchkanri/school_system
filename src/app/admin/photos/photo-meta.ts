/**
 * 写真共有機能の定数・型 (クライアント/サーバー双方から読み込む。サーバー専用モジュールを import しないこと)
 */

export const PHOTO_BUCKET = "student-photos";
/** 署名付きURLの有効期限 (1時間) */
export const PHOTO_URL_TTL = 60 * 60;
/** 1枚あたりのファイルサイズ上限 (10MB) */
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
/** 1回のアップロードで受け付ける最大枚数 */
export const MAX_PHOTO_COUNT = 20;
export const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export type PhotoAudience = "student" | "parent" | "both";

export const PHOTO_AUDIENCE_LABELS: Record<PhotoAudience, string> = {
  student: "本人のみ",
  parent: "保護者のみ",
  both: "本人・保護者",
};

export function isPhotoAudience(value: string): value is PhotoAudience {
  return value === "student" || value === "parent" || value === "both";
}
