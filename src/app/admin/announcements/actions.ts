"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyMany } from "@/lib/notify";
import type { AudienceType } from "@/lib/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
  count?: number;
}

interface Recipient {
  email: string | null;
  line_id: string | null;
}

const AUDIENCES: AudienceType[] = ["enrollee", "student", "parent", "supporter", "all"];

/** お知らせを作成し、対象者へメール/LINEを配信する */
export async function sendAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireRole("admin");

  const audience = String(formData.get("audience") ?? "") as AudienceType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sendEmail = formData.get("send_email") === "on";
  const sendLine = formData.get("send_line") === "on";

  if (!AUDIENCES.includes(audience)) return { error: "配信対象を選択してください" };
  if (!title || !body) return { error: "タイトルと本文は必須です" };
  if (!sendEmail && !sendLine) return { error: "メール・LINEのいずれかの配信方法を選択してください" };

  const db = adminDb();
  const { error } = await db.from("announcements").insert({
    audience,
    title,
    body,
    send_email: sendEmail,
    send_line: sendLine,
    created_by: profile.id,
  });
  if (error) return { error: "お知らせの作成に失敗しました" };

  // 対象者の宛先を収集
  let recipients: Recipient[] = [];
  if (audience === "enrollee") {
    // 入学決定者 = 合格通知済みのリード
    const { data } = await db
      .from("admission_decisions")
      .select("leads(email, line_id)")
      .eq("result", "accepted");
    recipients = ((data ?? []) as unknown as { leads: Recipient | null }[])
      .map((r) => r.leads)
      .filter((l): l is Recipient => l !== null);
  } else {
    let query = db.from("profiles").select("email, line_id");
    if (audience !== "all") query = query.eq("role", audience);
    const { data } = await query;
    recipients = (data ?? []) as Recipient[];
  }

  const count = await notifyMany(recipients, title, body, "announcement", {
    email: sendEmail,
    line: sendLine,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/notifications");
  return { ok: true, count };
}
