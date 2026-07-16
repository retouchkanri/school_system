"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { advanceLeadStatus } from "@/lib/data";

/** 最終ステップの進行 (制服注文済 / 入寮準備完了 / 入学式完了) */
export async function advanceEnrollmentStepAction(formData: FormData): Promise<void> {
  await requireRole("admin");

  const leadId = String(formData.get("lead_id") ?? "");
  const step = String(formData.get("step") ?? "");
  if (!leadId) return;

  if (step === "uniform_ordered" || step === "dorm_ready" || step === "enrolled") {
    await advanceLeadStatus(leadId, step);
    revalidatePath("/admin/enrollments");
  }
}
