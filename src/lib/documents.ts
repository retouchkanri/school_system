import { adminDb } from "@/lib/supabase/admin";
import type { ApplicationDocumentFile } from "@/lib/types";

const APPLICATION_DOCUMENTS_BUCKET = "application-documents";
const ENROLLMENT_DOCUMENTS_BUCKET = "enrollment-documents";
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ALLOWED_ID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * documents jsonb列の実データがファイルアップロード形式か判定する。
 * アップロード機能導入前は自己申告のboolean(true/false)が保存されていたため、
 * 移行前の古いレコードでは値がtrueでもpathを持たない場合がある。
 */
export function isApplicationDocumentFile(value: unknown): value is ApplicationDocumentFile {
  return !!value && typeof value === "object" && typeof (value as ApplicationDocumentFile).path === "string";
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-z0-9]+$/i.test(fromName)) return fromName.toLowerCase();
  switch (file.type) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

async function uploadToBucket(
  bucket: string,
  userId: string,
  fileKey: string,
  file: File,
  allowedTypes: string[],
  errorMessage: string
): Promise<ApplicationDocumentFile | { error: string }> {
  if (!allowedTypes.includes(file.type)) return { error: errorMessage };
  if (file.size > MAX_DOCUMENT_SIZE) return { error: "ファイルサイズは10MB以下にしてください" };

  const path = `${userId}/${fileKey}-${Date.now()}.${extFromFile(file)}`;
  const buffer = await file.arrayBuffer();
  const { error } = await adminDb().storage.from(bucket).upload(path, buffer, { contentType: file.type, upsert: true });
  if (error) return { error: "ファイルのアップロードに失敗しました" };

  return { path, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
}

async function getBucketSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string | null> {
  const { data, error } = await adminDb().storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/** 出願書類(入学願書・顔写真・成績証明書)をストレージへアップロードし、DB保存用の情報を返す */
export async function uploadApplicationDocument(
  userId: string,
  docKey: string,
  file: File
): Promise<ApplicationDocumentFile | { error: string }> {
  return uploadToBucket(
    APPLICATION_DOCUMENTS_BUCKET,
    userId,
    docKey,
    file,
    ALLOWED_DOCUMENT_TYPES,
    "ファイルはPDF・PNG・JPEG・WEBP形式でアップロードしてください"
  );
}

/** 出願書類の一時ダウンロードURLを発行する (本人・管理者のみ呼び出すこと) */
export async function getApplicationDocumentSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  return getBucketSignedUrl(APPLICATION_DOCUMENTS_BUCKET, path, expiresIn);
}

/** 出願書類の中身をバイナリで取得する (管理者の一括ダウンロード用) */
export async function downloadApplicationDocument(path: string): Promise<ArrayBuffer | null> {
  const { data, error } = await adminDb().storage.from(APPLICATION_DOCUMENTS_BUCKET).download(path);
  if (error || !data) return null;
  return data.arrayBuffer();
}

/** 入学手続きの本人確認書類(顔写真・保険証・マイナンバー、表裏)をストレージへアップロードする */
export async function uploadEnrollmentDocument(
  userId: string,
  fileKey: string,
  file: File
): Promise<ApplicationDocumentFile | { error: string }> {
  return uploadToBucket(
    ENROLLMENT_DOCUMENTS_BUCKET,
    userId,
    fileKey,
    file,
    ALLOWED_ID_IMAGE_TYPES,
    "画像はPNG・JPEG・WEBP形式でアップロードしてください"
  );
}

/** 入学手続きの本人確認書類の一時ダウンロードURLを発行する (本人・管理者のみ呼び出すこと) */
export async function getEnrollmentDocumentSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  return getBucketSignedUrl(ENROLLMENT_DOCUMENTS_BUCKET, path, expiresIn);
}
