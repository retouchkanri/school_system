"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { summarizeHorseMonth, type ReportForSummary } from "@/lib/ai";
import { notifyBoth } from "@/lib/notify";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

interface ReportRow {
  report_date: string;
  content: string;
  horse_condition: string | null;
  students: { name: string } | null;
}

interface SummaryRow {
  id: string;
  horse_id: string;
  year: number;
  month: number;
  summary: string;
  horses: { name: string } | null;
}

interface SupporterRow {
  name: string;
  profiles: { email: string | null; line_id: string | null } | null;
}

/** 対象月の騎乗報告からAI月次要約を生成して upsert する */
export async function generateSummaryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const horseId = String(formData.get("horse_id") ?? "");
  const target = String(formData.get("target") ?? "current"); // current | previous
  if (!horseId) return { error: "対象の馬が不明です" };

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() - (target === "previous" ? 1 : 0), 1);
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const mm = String(month).padStart(2, "0");
  const monthStart = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const db = adminDb();
  const { data: horse } = await db.from("horses").select("id, name").eq("id", horseId).single();
  if (!horse) return { error: "馬が見つかりません" };
  const horseName = String(horse.name);

  const { data: reportRows } = await db
    .from("riding_reports")
    .select("report_date, content, horse_condition, students(name)")
    .eq("horse_id", horseId)
    .gte("report_date", monthStart)
    .lte("report_date", monthEnd)
    .order("report_date");

  const reports: ReportForSummary[] = ((reportRows ?? []) as unknown as ReportRow[]).map((r) => ({
    report_date: r.report_date,
    content: r.content,
    horse_condition: r.horse_condition,
    student_name: r.students?.name,
  }));

  const summary = await summarizeHorseMonth(horseName, year, month, reports);

  const { error } = await db.from("horse_monthly_summaries").upsert(
    { horse_id: horseId, year, month, summary, report_count: reports.length },
    { onConflict: "horse_id,year,month" }
  );
  if (error) return { error: "要約の保存に失敗しました" };

  revalidatePath("/admin/retouch");
  return { ok: true, message: `✓ ${year}年${month}月の要約を生成しました(騎乗報告 ${reports.length}件)` };
}

/** 月次要約を shared=true にし、その馬の一口支援者へ通知を送信する */
export async function shareSummaryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const summaryId = String(formData.get("summary_id") ?? "");
  if (!summaryId) return { error: "対象の要約が不明です" };

  const db = adminDb();
  const { data } = await db
    .from("horse_monthly_summaries")
    .select("id, horse_id, year, month, summary, horses(name)")
    .eq("id", summaryId)
    .single();
  if (!data) return { error: "要約が見つかりません" };
  const summaryRow = data as unknown as SummaryRow;
  const horseName = summaryRow.horses?.name ?? "担当馬";

  const { error } = await db.from("horse_monthly_summaries").update({ shared: true }).eq("id", summaryId);
  if (error) return { error: "共有状態の更新に失敗しました" };

  const { data: supporterRows } = await db
    .from("supporters")
    .select("name, profiles(email, line_id)")
    .eq("horse_id", summaryRow.horse_id);

  let sent = 0;
  for (const s of (supporterRows ?? []) as unknown as SupporterRow[]) {
    const delivered = await notifyBoth(
      s.profiles?.email ?? null,
      s.profiles?.line_id ?? null,
      `今月の${horseName}号レポート`,
      `${s.name}様\n\nいつも温かいご支援をありがとうございます。\n${summaryRow.year}年${summaryRow.month}月の${horseName}号の様子をお届けします。\n\n${summaryRow.summary}`,
      "horse_report"
    );
    if (delivered > 0) sent++;
  }

  revalidatePath("/admin/retouch");
  revalidatePath("/supporter");
  return { ok: true, message: `✓ 支援者と共有しました(${sent}名に送信)` };
}
