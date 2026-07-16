"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { getLeadForUser, advanceLeadStatus } from "@/lib/data";

const VIDEO_TITLE = "学院紹介動画";
const MILESTONES = [25, 50, 75, 100];

export interface VideoProgressResult {
  ok: boolean;
  error?: string;
}

/** 動画の視聴進捗を記録 (25/50/75/100% のマイルストーンで呼ばれる) */
export async function reportVideoProgressAction(percent: number): Promise<VideoProgressResult> {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);
  if (!lead || lead.user_id !== profile.id) return { ok: false, error: "リード情報が見つかりません" };
  if (!MILESTONES.includes(percent)) return { ok: false, error: "不正な進捗値です" };

  const status = percent >= 100 ? "completed" : "in_progress";
  const { error } = await adminDb()
    .from("video_progress")
    .upsert(
      {
        lead_id: lead.id,
        video_title: VIDEO_TITLE,
        status,
        progress_percent: percent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,video_title" }
    );
  if (error) return { ok: false, error: "進捗の保存に失敗しました" };

  if (percent >= 100) {
    await advanceLeadStatus(lead.id, "video_watched");
  }

  revalidatePath("/mypage/video");
  revalidatePath("/mypage");
  return { ok: true };
}
