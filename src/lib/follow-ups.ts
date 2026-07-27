import { adminDb } from "@/lib/supabase/admin";
import { notifyBoth } from "@/lib/notify";
import { FOLLOW_UP_RULES, type FollowUpRuleKey } from "@/lib/constants";
import type {
  Application,
  FollowUpLog,
  FollowUpSetting,
  Lead,
  OpenCampusBooking,
  OpenCampusEvent,
  PreScreeningSurvey,
  VideoProgress,
} from "@/lib/types";

/**
 * フォロー対象の自動抽出と自動送信。
 * 管理画面の一覧表示 (admin/follow-ups, admin ダッシュボード) と
 * cron による自動送信 (/api/cron/follow-ups) が同じ判定ロジックを共有するためのモジュール。
 */

export interface FollowUpTarget {
  lead: Lead;
  /** 条件が成立してからの経過日数 */
  days: number;
  /** 既にこのルールでフォロー送信済みか */
  sent: boolean;
}

export type FollowUpTargets = Record<FollowUpRuleKey, FollowUpTarget[]>;

/** フォロー通知の文面 (ルールごと) */
export const FOLLOW_UP_MESSAGES: Record<FollowUpRuleKey, { title: string; body: (name: string) => string }> = {
  video_no_survey: {
    title: "【東関東馬事学院】入学仮審査アンケートのご案内",
    body: (name) =>
      `${name} 様\n\n学院紹介動画のご視聴ありがとうございました。\n` +
      `次のステップとして、マイページより「入学仮審査アンケート」へのご回答をお願いいたします。\n` +
      `ご回答いただくと、学校見学・オープンキャンパスのご予約にお進みいただけます。`,
  },
  survey_no_booking: {
    title: "【東関東馬事学院】学校見学・オープンキャンパスのご案内",
    body: (name) =>
      `${name} 様\n\n入学仮審査アンケートへのご回答ありがとうございました。\n` +
      `ぜひ一度、学校見学・オープンキャンパスへお越しください。実際の馬や寮、授業の様子をご覧いただけます。\n` +
      `マイページよりご希望の日程をご予約いただけます。`,
  },
  attended_no_application: {
    title: "【東関東馬事学院】出願のご案内",
    body: (name) =>
      `${name} 様\n\n先日は体験・見学にご参加いただきありがとうございました。\n` +
      `現在、出願を受付中です。マイページよりお手続きいただけます。\n` +
      `ご不明な点やご不安なことがあれば、お気軽にご相談ください。`,
  },
};

export function isFollowUpRule(rule: string): rule is FollowUpRuleKey {
  return FOLLOW_UP_RULES.some((r) => r.key === rule);
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

/**
 * 3つのフォロールールに該当する見込み客を抽出する。
 * 「体験参加後14日経過」の14日はルール定義そのものなのでここで固定的に適用する。
 * 自動送信の待機日数 (min_days) は別途 runAutomaticFollowUps 側で絞り込む。
 */
export async function findFollowUpTargets(): Promise<FollowUpTargets> {
  const db = adminDb();
  const [
    { data: leadsData },
    { data: videosData },
    { data: surveysData },
    { data: bookingsData },
    { data: appsData },
    { data: logsData },
  ] = await Promise.all([
    db.from("leads").select("*").order("created_at", { ascending: false }),
    db.from("video_progress").select("*").eq("status", "completed"),
    db.from("pre_screening_surveys").select("*"),
    db.from("open_campus_bookings").select("*, open_campus_events(*)"),
    db.from("applications").select("*"),
    db.from("follow_up_logs").select("*"),
  ]);

  const leads = (leadsData ?? []) as Lead[];
  const videos = (videosData ?? []) as VideoProgress[];
  const surveys = (surveysData ?? []) as PreScreeningSurvey[];
  const bookings = (bookingsData ?? []) as (OpenCampusBooking & {
    open_campus_events: OpenCampusEvent | null;
  })[];
  const applications = (appsData ?? []) as Application[];
  const logs = (logsData ?? []) as FollowUpLog[];

  const videoCompletedAt = new Map<string, string>();
  for (const v of videos) {
    const prev = videoCompletedAt.get(v.lead_id);
    if (!prev || new Date(v.updated_at) > new Date(prev)) videoCompletedAt.set(v.lead_id, v.updated_at);
  }
  const surveyAt = new Map<string, string>();
  for (const s of surveys) surveyAt.set(s.lead_id, s.submitted_at);
  const bookingLeadIds = new Set(bookings.map((b) => b.lead_id));
  const attendedAt = new Map<string, string>();
  for (const b of bookings) {
    if (b.status !== "attended") continue;
    const d = b.open_campus_events?.event_date ?? b.created_at;
    const prev = attendedAt.get(b.lead_id);
    if (!prev || new Date(d) > new Date(prev)) attendedAt.set(b.lead_id, d);
  }
  const appliedIds = new Set(applications.map((a) => a.lead_id));
  const sentSet = new Set(logs.map((l) => `${l.lead_id}:${l.rule}`));

  const withSent = (rule: FollowUpRuleKey) => (row: { lead: Lead; days: number }): FollowUpTarget => ({
    ...row,
    sent: sentSet.has(`${row.lead.id}:${rule}`),
  });

  return {
    video_no_survey: leads
      .filter((l) => videoCompletedAt.has(l.id) && !surveyAt.has(l.id))
      .map((l) => ({ lead: l, days: daysSince(videoCompletedAt.get(l.id) as string) }))
      .map(withSent("video_no_survey")),

    survey_no_booking: leads
      .filter((l) => surveyAt.has(l.id) && !bookingLeadIds.has(l.id))
      .map((l) => ({ lead: l, days: daysSince(surveyAt.get(l.id) as string) }))
      .map(withSent("survey_no_booking")),

    attended_no_application: leads
      .filter((l) => attendedAt.has(l.id) && !appliedIds.has(l.id))
      .map((l) => ({ lead: l, days: daysSince(attendedAt.get(l.id) as string) }))
      .filter((r) => r.days >= 14)
      .map(withSent("attended_no_application")),
  };
}

/** 自動送信設定を取得する (未登録のルールは既定値で補う) */
export async function getFollowUpSettings(): Promise<Record<FollowUpRuleKey, FollowUpSetting>> {
  const { data } = await adminDb().from("follow_up_settings").select("*");
  const rows = (data ?? []) as FollowUpSetting[];
  const byRule = new Map(rows.map((r) => [r.rule, r]));

  return Object.fromEntries(
    FOLLOW_UP_RULES.map((r) => [
      r.key,
      byRule.get(r.key) ?? {
        rule: r.key,
        auto_enabled: false,
        min_days: r.defaultMinDays,
        last_run_at: null,
        last_sent_count: 0,
        updated_at: new Date().toISOString(),
      },
    ])
  ) as Record<FollowUpRuleKey, FollowUpSetting>;
}

/** 1件のリードへフォロー通知を送り follow_up_logs に記録する */
export async function sendFollowUpToLead(
  lead: Lead,
  rule: FollowUpRuleKey,
  opts: { automated?: boolean } = {}
): Promise<boolean> {
  if (!lead.email && !lead.line_id) return false;
  const msg = FOLLOW_UP_MESSAGES[rule];
  if (!msg) return false;

  await notifyBoth(lead.email, lead.line_id, msg.title, msg.body(lead.name), "lead_followup");

  const automated = opts.automated ?? false;
  const logs: { lead_id: string; rule: string; channel: string; automated: boolean }[] = [];
  if (lead.email) logs.push({ lead_id: lead.id, rule, channel: "email", automated });
  if (lead.line_id) logs.push({ lead_id: lead.id, rule, channel: "line", automated });
  if (logs.length > 0) await adminDb().from("follow_up_logs").insert(logs);
  return true;
}

export interface AutoFollowUpResult {
  rule: FollowUpRuleKey;
  enabled: boolean;
  matched: number;
  sent: number;
}

/**
 * 自動送信が有効なルールについて、未送信かつ待機日数を満たしたリードへフォローを自動送信する。
 * cron (/api/cron/follow-ups) から定期実行される。
 * 同じリードへ同じルールで二重送信しないよう follow_up_logs で必ず重複を排除する。
 */
export async function runAutomaticFollowUps(): Promise<AutoFollowUpResult[]> {
  const [targets, settings] = await Promise.all([findFollowUpTargets(), getFollowUpSettings()]);
  const now = new Date().toISOString();
  const results: AutoFollowUpResult[] = [];

  for (const rule of FOLLOW_UP_RULES) {
    const setting = settings[rule.key];
    const rows = targets[rule.key] ?? [];
    const eligible = rows.filter(
      (r) => !r.sent && r.days >= setting.min_days && (r.lead.email || r.lead.line_id)
    );

    if (!setting.auto_enabled) {
      results.push({ rule: rule.key, enabled: false, matched: eligible.length, sent: 0 });
      continue;
    }

    let sent = 0;
    for (const target of eligible) {
      try {
        if (await sendFollowUpToLead(target.lead, rule.key, { automated: true })) sent++;
      } catch {
        // 1件の送信失敗で全体を止めない (次回実行時に未送信として再度対象になる)
      }
    }

    await adminDb().from("follow_up_settings").upsert(
      {
        rule: rule.key,
        auto_enabled: setting.auto_enabled,
        min_days: setting.min_days,
        last_run_at: now,
        last_sent_count: sent,
        updated_at: now,
      },
      { onConflict: "rule" }
    );

    results.push({ rule: rule.key, enabled: true, matched: eligible.length, sent });
  }

  return results;
}
