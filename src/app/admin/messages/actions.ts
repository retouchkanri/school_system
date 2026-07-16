"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";

export interface ActionState {
  ok?: boolean;
  error?: string;
  count?: number;
}

interface Recipient {
  email: string | null;
  line_id: string | null;
}

/** 在校生・保護者への一斉メール/LINE送信 + bulk_messages への記録 */
export async function sendBulkMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const audience = String(formData.get("audience") ?? ""); // students / parents / both
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const viaEmail = formData.get("via_email") === "on";
  const viaLine = formData.get("via_line") === "on";

  if (!["students", "parents", "both"].includes(audience)) return { error: "送信対象を選択してください" };
  if (!title || !body) return { error: "件名と本文は必須です" };
  if (!viaEmail && !viaLine) return { error: "メール・LINEのいずれかの送信方法を選択してください" };

  const roles = audience === "students" ? ["student"] : audience === "parents" ? ["parent"] : ["student", "parent"];

  const db = adminDb();
  const { data } = await db.from("profiles").select("email, line_id").in("role", roles);
  const recipients = (data ?? []) as Recipient[];

  let count = 0;
  for (const r of recipients) {
    const sent = await notifyBoth(r.email, r.line_id, title, body, "bulk", { email: viaEmail, line: viaLine });
    if (sent > 0) count++;
  }

  const { error } = await db.from("bulk_messages").insert({
    audience,
    title,
    body,
    via_email: viaEmail,
    via_line: viaLine,
    recipient_count: count,
    sent_by: profile.id,
  });
  if (error) return { error: "送信履歴の保存に失敗しました" };

  revalidatePath("/admin/messages");
  revalidatePath("/admin/notifications");
  return { ok: true, count };
}
