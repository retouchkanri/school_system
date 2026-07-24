"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth, notifyStaff } from "@/lib/notify";
import type { Profile } from "@/lib/types";
import type { ApprovalStatus, OvernightLeaveRequest } from "@/lib/types";

export interface OvernightDecisionState {
  ok?: boolean;
  error?: string;
}

export async function decideOvernightRequest(
  _prev: OvernightDecisionState,
  formData: FormData
): Promise<OvernightDecisionState> {
  const profile = await requireRole("parent");

  const id = String(formData.get("id") ?? "");
  const decisionRaw = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  const decision: ApprovalStatus | null =
    decisionRaw === "approved" ? "approved" : decisionRaw === "rejected" ? "rejected" : null;
  if (!id || !decision) return { error: "不正な操作です" };

  // 所有権検証: 対象の届が自分の子のものであること
  const children = await getStudentsForParent(profile.id);
  const { data } = await adminDb().from("overnight_leave_requests").select("*").eq("id", id).maybeSingle();
  const request = (data as OvernightLeaveRequest | null) ?? null;
  if (!request) return { error: "対象の外泊届が見つかりません" };

  const child = children.find((c) => c.id === request.student_id);
  if (!child) return { error: "この外泊届を操作する権限がありません" };
  if (request.parent_approval !== "pending") return { error: "この外泊届はすでに処理済みです" };

  // pending 条件付きで更新し、二重送信・連打での上書きを防ぐ
  const { data: updated, error } = await adminDb()
    .from("overnight_leave_requests")
    .update({
      parent_approval: decision,
      parent_comment: comment || null,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("parent_approval", "pending")
    .select("id");
  if (error) return { error: "更新に失敗しました" };
  if (!updated || updated.length === 0) return { error: "この外泊届はすでに処理済みです" };

  // 職員向け通知 (CONTACT_RECIPIENTS 優先、未設定なら管理者アカウントのメールへ)
  const decisionLabel = decision === "approved" ? "承認" : "却下";
  const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
  const adminEmails = ((adminsData ?? []) as { email: string | null }[]).map((a) => a.email).filter(Boolean) as string[];
  await notifyStaff(
    `外泊届が保護者により${decisionLabel}されました(${child.name})`,
    `生徒: ${child.name}(${child.student_number})\n期間: ${request.start_date} 〜 ${request.end_date}\n行き先: ${request.destination}${comment ? `\n保護者コメント: ${comment}` : ""}`,
    "overnight_approval",
    adminEmails
  );

  // 生徒本人へも結果を通知
  if (child.user_id) {
    const { data: studentProfileData } = await adminDb().from("profiles").select("*").eq("id", child.user_id).maybeSingle();
    const studentProfile = (studentProfileData as Profile | null) ?? null;
    if (studentProfile) {
      await notifyBoth(
        studentProfile.email,
        studentProfile.line_id,
        `外泊届が${decisionLabel}されました`,
        `${request.start_date} 〜 ${request.end_date}(行き先: ${request.destination})の外泊届が保護者により${decisionLabel}されました。${comment ? `\n保護者コメント: ${comment}` : ""}`,
        "overnight_approval"
      );
    }
  }

  revalidatePath("/parent/overnight");
  revalidatePath("/parent");
  revalidatePath("/student/overnight");
  revalidatePath("/student");
  return { ok: true };
}
