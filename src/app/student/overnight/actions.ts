"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth, notifyStaff } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import type { Profile } from "@/lib/types";

export interface OvernightActionState {
  ok?: boolean;
  error?: string;
  /** 保護者への承認依頼を実際に送信できたか (保護者アカウント未連携の場合 false) */
  parentNotified?: boolean;
}

export async function submitOvernightRequest(
  _prev: OvernightActionState,
  formData: FormData
): Promise<OvernightActionState> {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);
  if (!student) return { error: "生徒情報が登録されていません" };

  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const destination = String(formData.get("destination") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startDate || !endDate || !destination) return { error: "開始日・終了日・行き先は必須です" };
  if (endDate < startDate) return { error: "終了日は開始日以降の日付を指定してください" };

  const { error } = await adminDb().from("overnight_leave_requests").insert({
    student_id: student.id,
    start_date: startDate,
    end_date: endDate,
    destination,
    reason: reason || null,
    parent_approval: "pending",
  });
  if (error) return { error: "外泊届の提出に失敗しました" };

  const origin = await siteOrigin();

  // 保護者へ承認依頼を通知
  let parentNotified = false;
  if (student.parent_user_id) {
    const { data } = await adminDb().from("profiles").select("*").eq("id", student.parent_user_id).maybeSingle();
    const parent = (data as Profile | null) ?? null;
    if (parent) {
      const approvalUrl = `${origin}/parent/overnight`;
      const sent = await notifyBoth(
        parent.email,
        parent.line_id,
        "外泊届の承認をお願いします",
        `${student.name} さんから外泊届が提出されました。\n期間: ${startDate} 〜 ${endDate}\n行き先: ${destination}${reason ? `\n理由: ${reason}` : ""}\n保護者ページの「外泊承認」よりご確認・ご承認をお願いします。\n\n▼承認ページ\n${approvalUrl}`,
        "overnight_request"
      );
      parentNotified = sent > 0;
    }
  }

  // 職員へも提出を通知 (承認待ちの滞留に気づけるようにするため)。
  // 通知の失敗で提出自体を失敗扱いにしないよう try/catch で囲む。
  try {
    const { data: adminsData } = await adminDb().from("profiles").select("email").eq("role", "admin");
    const adminEmails = ((adminsData ?? []) as { email: string | null }[])
      .map((a) => a.email)
      .filter(Boolean) as string[];
    const parentLine = parentNotified
      ? "保護者への承認依頼: 送信済み"
      : "保護者への承認依頼: 未送信\n※保護者アカウント未連携のため承認依頼は送信されていません。職員によるフォローをお願いします。";
    await notifyStaff(
      `【東関東馬事学院】外泊届が提出されました (${student.name})`,
      `生徒: ${student.name}(${student.student_number})\n期間: ${startDate} 〜 ${endDate}\n行き先: ${destination}\n理由: ${reason || "—"}\n${parentLine}\n\n▼外泊届の管理ページ\n${origin}/admin/overnight`,
      "overnight_submitted",
      adminEmails
    );
  } catch (e) {
    console.error("[overnight] 職員向け提出通知に失敗:", e);
  }

  revalidatePath("/student/overnight");
  revalidatePath("/student");
  revalidatePath("/parent/overnight");
  revalidatePath("/parent");
  return { ok: true, parentNotified };
}
