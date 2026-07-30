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
  rideability: number | null;
  horse_mood: string | null;
  incident: string | null;
  fell_off: boolean;
  students: { name: string } | null;
}

interface SummaryRow {
  id: string;
  horse_id: string;
  year: number;
  month: number;
  summary: string;
  shared: boolean;
  horses: { name: string } | null;
}

interface SupporterRow {
  name: string;
  profiles: { email: string | null; line_id: string | null } | null;
}

/** その馬の一口支援者へ月次レポートを送信し、1チャネル以上届いた人数を返す */
async function notifySupportersOfSummary(
  horseId: string,
  horseName: string,
  year: number,
  month: number,
  summary: string
): Promise<number> {
  const { data: supporterRows } = await adminDb()
    .from("supporters")
    .select("name, profiles(email, line_id)")
    .eq("horse_id", horseId);

  let sent = 0;
  for (const s of (supporterRows ?? []) as unknown as SupporterRow[]) {
    const delivered = await notifyBoth(
      s.profiles?.email ?? null,
      s.profiles?.line_id ?? null,
      `今月の${horseName}号レポート`,
      `${s.name}様\n\nいつも温かいご支援をありがとうございます。\n${year}年${month}月の${horseName}号の様子をお届けします。\n\n${summary}`,
      "horse_report"
    );
    if (delivered > 0) sent++;
  }
  return sent;
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

  // 乗りやすさ・馬の様子・落馬・ヒヤリハットも材料に含める (生徒たちのリアルな声を反映させるため)
  const { data: reportRows } = await db
    .from("riding_reports")
    .select("report_date, content, horse_condition, rideability, horse_mood, incident, fell_off, students(name)")
    .eq("horse_id", horseId)
    .gte("report_date", monthStart)
    .lte("report_date", monthEnd)
    .order("report_date");

  const reports: ReportForSummary[] = ((reportRows ?? []) as unknown as ReportRow[]).map((r) => ({
    report_date: r.report_date,
    content: r.content,
    horse_condition: r.horse_condition,
    student_name: r.students?.name,
    rideability: r.rideability,
    horse_mood: r.horse_mood,
    incident: r.incident,
    fell_off: r.fell_off ?? false,
  }));

  const summary = await summarizeHorseMonth(horseName, year, month, reports);

  // 再生成時は共有済みフラグを戻す (内容が変わるため、確認のうえ改めて「共有」してもらう)
  const { error } = await db.from("horse_monthly_summaries").upsert(
    { horse_id: horseId, year, month, summary, report_count: reports.length, shared: false },
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
    .select("id, horse_id, year, month, summary, shared, horses(name)")
    .eq("id", summaryId)
    .single();
  if (!data) return { error: "要約が見つかりません" };
  const summaryRow = data as unknown as SummaryRow;
  const horseName = summaryRow.horses?.name ?? "担当馬";

  const { error } = await db.from("horse_monthly_summaries").update({ shared: true }).eq("id", summaryId);
  if (error) return { error: "共有状態の更新に失敗しました" };

  revalidatePath("/admin/retouch");
  revalidatePath("/supporter");

  // 通知はDB書き込み成功後に。通知失敗で公開処理自体を巻き戻さない
  let sent = 0;
  let notifyFailed = false;
  try {
    sent = await notifySupportersOfSummary(
      summaryRow.horse_id,
      horseName,
      summaryRow.year,
      summaryRow.month,
      summaryRow.summary
    );
  } catch {
    notifyFailed = true;
  }

  if (notifyFailed) {
    return { ok: true, message: "✓ 支援者ポータルに公開しました(通知の送信に失敗しました。送信ログをご確認ください)" };
  }
  if (sent === 0) {
    return {
      ok: true,
      message: "✓ 支援者ポータルに公開しました(通知を送れる支援者がいません。支援者のアカウント連携をご確認ください)",
    };
  }
  return { ok: true, message: `✓ 支援者と共有しました(${sent}名に送信)` };
}

/**
 * 職員が生成されたレポート本文を手直しして保存する。
 * 生成AIの文面をそのまま外部の支援者へ出さず、誤りや不適切な表現を職員が直せるようにするための実運用必須機能。
 * 共有済み(shared=true)のレポートを編集しても shared は false に戻さず、公開状態を維持したまま本文だけ差し替える。
 * 支援者へ再通知するかは職員がチェックボックスで選ぶ。
 */
export async function updateSummaryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const summaryId = String(formData.get("summary_id") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const renotify = formData.get("renotify") === "on";
  if (!summaryId) return { error: "対象の要約が不明です" };
  if (!summary) return { error: "レポート本文を入力してください" };

  const db = adminDb();
  const { data } = await db
    .from("horse_monthly_summaries")
    .select("id, horse_id, year, month, summary, shared, horses(name)")
    .eq("id", summaryId)
    .single();
  if (!data) return { error: "要約が見つかりません" };
  const summaryRow = data as unknown as SummaryRow;

  const { error } = await db.from("horse_monthly_summaries").update({ summary }).eq("id", summaryId);
  if (error) return { error: "レポートの保存に失敗しました" };

  revalidatePath("/admin/retouch");
  if (summaryRow.shared) revalidatePath("/supporter");

  if (renotify && summaryRow.shared) {
    let sent = 0;
    let notifyFailed = false;
    try {
      sent = await notifySupportersOfSummary(
        summaryRow.horse_id,
        summaryRow.horses?.name ?? "担当馬",
        summaryRow.year,
        summaryRow.month,
        summary
      );
    } catch {
      notifyFailed = true;
    }
    if (notifyFailed) {
      return { ok: true, message: "✓ 保存しました(再通知の送信に失敗しました。送信ログをご確認ください)" };
    }
    return {
      ok: true,
      message: sent > 0 ? `✓ 保存し、支援者へ再通知しました(${sent}名に送信)` : "✓ 保存しました(通知を送れる支援者がいません)",
    };
  }

  return {
    ok: true,
    message: summaryRow.shared ? "✓ 保存しました(共有済みの公開内容を更新しました)" : "✓ 保存しました",
  };
}
