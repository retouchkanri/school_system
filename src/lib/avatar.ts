import { adminDb } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

/** アバター画像をストレージへアップロードし公開URLを返す */
export async function uploadAvatarFile(
  userId: string,
  file: File | Blob,
  contentType?: string
): Promise<string | { error: string }> {
  const mime = file instanceof File ? file.type : contentType ?? "image/jpeg";
  if (!ALLOWED_AVATAR_TYPES.includes(mime)) {
    return { error: "画像はPNG・JPEG・WEBP・GIF形式でアップロードしてください" };
  }
  const size = file.size;
  if (size > MAX_AVATAR_SIZE) {
    return { error: "画像サイズは5MB以下にしてください" };
  }

  const path = `${userId}/avatar.${extFromMime(mime)}`;
  const buffer = await file.arrayBuffer();
  const { error } = await adminDb()
    .storage.from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (error) return { error: "画像のアップロードに失敗しました" };

  const { data } = adminDb().storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
