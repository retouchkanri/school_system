"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { siteOrigin } from "@/lib/url";
import { fmtDate } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/constants";
import type { AbsenceRequest, AbsenceRequestStatus, Profile, Student } from "@/lib/types";

export interface AbsenceDecisionState {
  ok?: boolean;
  error?: string;
}

export async function handleAbsenceRequest(
  _prev: AbsenceDecisionState,
  formData: FormData
): Promise<AbsenceDecisionState> {
  const profile = await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  const decisionRaw = String(formData.get("decision") ?? "");
  const comment = String(formData.get("staff_comment") ?? "").trim();
  const reflect = formData.get("reflect") === "on";

  const decision: AbsenceRequestStatus | null =
    decisionRaw === "acknowledged" ? "acknowledged" : decisionRaw === "rejected" ? "rejected" : null;
  if (!id || !decision) return { error: "不正な操作です" };

  const db = adminDb();
  const { data } = await db
    .from("absence_requests")
    .select("*, student:students(id, name, student_number, parent_user_id)")
    .eq("id", id)
    .maybeSingle();
  const request =
    (data as
      | (AbsenceRequest & {
          student: Pick<Student, "id" | "name" | "student_number" | "parent_user_id"> | null;
        })
      | null) ?? null;
  if (!request) return { error: "対象の連絡が見つかりません" };
  if (request.status !== "pending") return { error: "この連絡はすでに処理済みです" };

  const shouldReflect = decision === "acknowledged" && reflect;
  const handledAt = new Date().toISOString();

  // pending 条件付きで更新し、二重送信・連打での上書きを防ぐ
  const { data: updated, error } = await db
    .from("absence_requests")
    .update({
      status: decision,
      staff_comment: comment || null,
      handled_by: profile.id,
      handled_at: handledAt,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: "更新に失敗しました" };
  if (!updated || updated.length === 0) return { error: "この連絡はすでに処理済みです" };

  // 受理かつ「出欠記録にも反映する」が選択されていれば attendance_records へ反映
  let reflected = false;
  if (shouldReflect) {
    const { error: attError } = await db.from("attendance_records").upsert(
      {
        student_id: request.student_id,
        date: request.date,
        status: request.kind,
        note: `事前連絡: ${request.reason}`,
        recorded_by: profile.id,
      },
      { onConflict: "student_id,date" }
    );
    if (!attError) {
      reflected = true;
      await db.from("absence_requests").update({ reflected_to_attendance: true }).eq("id", id);
    }
  }

  // 提出者へ結果を通知
  if (request.submitted_by) {
    const { data: submitterData } = await db
      .from("profiles")
      .select("*")
      .eq("id", request.submitted_by)
      .maybeSingle();
    const submitter = (submitterData as Profile | null) ?? null;
    if (submitter) {
      const decisionLabel = decision === "acknowledged" ? "受理" : "却下";
      await notifyBoth(
        submitter.email,
        submitter.line_id,
        `欠席・遅刻の連絡が${decisionLabel}されました`,
        `${request.student?.name ?? ""}さんの ${fmtDate(request.date)} の${ATTENDANCE_STATUS_LABELS[request.kind]}のご連絡を${decisionLabel}しました。\n理由: ${request.reason}${comment ? `\n職員コメント: ${comment}` : ""}${reflected ? "\n出欠記録にも反映しました。" : ""}`,
        "absence_request_handled"
      );
    }
  }

  // 出欠へ反映した場合は、職員が /admin/attendance から手入力したときと同じように保護者へも知らせる。
  // 提出者が保護者本人のときは上の「処理結果」通知と重複するため送らない。
  if (reflected && request.student?.parent_user_id && request.student.parent_user_id !== request.submitted_by) {
    try {
      const { data: parentData } = await db
        .from("profiles")
        .select("*")
        .eq("id", request.student.parent_user_id)
        .maybeSingle();
      const parent = (parentData as Profile | null) ?? null;
      if (parent) {
        const label = ATTENDANCE_STATUS_LABELS[request.kind];
        await notifyBoth(
          parent.email,
          parent.line_id,
          `【東関東馬事学院】${request.student.name}さんの出欠記録 (${label})`,
          [
            `${request.student.name} さんご本人からの事前連絡にもとづき、出欠を以下のとおり記録しました。`,
            "",
            `日付: ${request.date.replace(/-/g, "/")}`,
            `状態: ${label}`,
            `理由: ${request.reason}`,
            ...(comment ? [`職員コメント: ${comment}`] : []),
            "",
            "詳細は保護者ポータルでご確認ください。",
            "",
            "▼保護者ポータル (出欠)",
            `${await siteOrigin()}/parent/attendance`,
          ].join("\n"),
          "attendance_alert"
        );
      }
    } catch (e) {
      console.error("[absence] 保護者への出欠通知に失敗しました:", e);
    }
  }

  revalidatePath("/admin/absences");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/monthly");
  revalidatePath("/student/absence");
  revalidatePath("/parent/absence");
  if (reflected) {
    revalidatePath("/student/attendance");
    revalidatePath("/parent/attendance");
  }
  return { ok: true };
}
