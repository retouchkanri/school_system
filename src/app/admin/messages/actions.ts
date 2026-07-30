"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";
import {
  ALL_CLASSES,
  BULK_AUDIENCES,
  BULK_AUDIENCE_SHORT_LABELS,
  bulkAudienceValue,
  classLabel,
  collectBulkRaw,
  listClassKeys,
  loadBulkDirectory,
  summarizeAudience,
  type BulkAudience,
} from "./audience";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** 1チャネル以上へ送信処理を実行できた宛先数 */
  count?: number;
  /** 送信対象の人数 (重複排除後) */
  targetCount?: number;
  /** メールを送信した件数 */
  emailCount?: number;
  /** LINEを送信した件数 */
  lineCount?: number;
  /** 送信対象の表示名 (例: 在校生 (1年A組)) */
  audienceLabel?: string;
}

/** 在校生・保護者への一斉メール/LINE送信 + bulk_messages への記録 */
export async function sendBulkMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const audience = String(formData.get("audience") ?? "") as BulkAudience; // students / parents / both
  const classFilter = String(formData.get("class_filter") ?? ALL_CLASSES).trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const viaEmail = formData.get("via_email") === "on";
  const viaLine = formData.get("via_line") === "on";

  if (!BULK_AUDIENCES.includes(audience)) return { error: "送信対象を選択してください" };
  if (!title || !body) return { error: "件名と本文は必須です" };
  if (!viaEmail && !viaLine) return { error: "メール・LINEのいずれかの送信方法を選択してください" };

  const dir = await loadBulkDirectory();
  // 未知のクラス値で意図しない宛先へ送らないよう、実在するクラスのみ許可する
  if (classFilter !== ALL_CLASSES && !listClassKeys(dir).includes(classFilter)) {
    return { error: "選択されたクラスが見つかりません。画面を再読み込みしてください" };
  }

  const { stat, recipients } = summarizeAudience(collectBulkRaw(dir, audience, classFilter));
  const emailCount = viaEmail ? recipients.filter((r) => r.email).length : 0;
  const lineCount = viaLine ? recipients.filter((r) => r.line_id).length : 0;
  if (emailCount + lineCount === 0) {
    return { error: "選択した条件に送信できる宛先がありません (メール・LINEの登録がありません)" };
  }

  const count = await notifyMany(recipients, title, body, "bulk", { email: viaEmail, line: viaLine });

  const audienceValue = bulkAudienceValue(audience, classFilter);

  // 履歴保存に失敗しても送信自体は完了している (失敗扱いにすると再送信→重複配信につながるため ok を返す)
  const db = adminDb();
  await db.from("bulk_messages").insert({
    audience: audienceValue,
    title,
    body,
    via_email: viaEmail,
    via_line: viaLine,
    recipient_count: count,
    sent_by: profile.id,
  });

  revalidatePath("/admin/messages");
  revalidatePath("/admin/notifications");
  return {
    ok: true,
    count,
    targetCount: stat.total,
    emailCount,
    lineCount,
    audienceLabel: `${BULK_AUDIENCE_SHORT_LABELS[audience]} (${classLabel(classFilter)})`,
  };
}
