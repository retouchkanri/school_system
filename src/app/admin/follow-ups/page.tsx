import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import { PageHeader, Card, Table, Td, Badge, LeadStatusBadge, EmptyState, btnSmall, btnPrimary } from "@/components/ui";
import type {
  Lead,
  VideoProgress,
  PreScreeningSurvey,
  OpenCampusBooking,
  OpenCampusEvent,
  Application,
  FollowUpLog,
} from "@/lib/types";
import { sendFollowUpAction, sendFollowUpBulkAction } from "./actions";

type BookingWithEvent = OpenCampusBooking & { open_campus_events: OpenCampusEvent | null };
type FollowRow = { lead: Lead; days: number };

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

export default async function AdminFollowUpsPage() {
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
  const bookings = (bookingsData ?? []) as BookingWithEvent[];
  const applications = (appsData ?? []) as Application[];
  const logs = (logsData ?? []) as FollowUpLog[];

  /* 集計用マップ */
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

  /* 3ルールの抽出 */
  const rule1: FollowRow[] = leads
    .filter((l) => videoCompletedAt.has(l.id) && !surveyAt.has(l.id))
    .map((l) => ({ lead: l, days: daysSince(videoCompletedAt.get(l.id) as string) }));

  const rule2: FollowRow[] = leads
    .filter((l) => surveyAt.has(l.id) && !bookingLeadIds.has(l.id))
    .map((l) => ({ lead: l, days: daysSince(surveyAt.get(l.id) as string) }));

  const rule3: FollowRow[] = leads
    .filter((l) => attendedAt.has(l.id) && !appliedIds.has(l.id))
    .map((l) => ({ lead: l, days: daysSince(attendedAt.get(l.id) as string) }))
    .filter((r) => r.days >= 14);

  const ruleRows: Record<string, FollowRow[]> = {
    video_no_survey: rule1,
    survey_no_booking: rule2,
    attended_no_application: rule3,
  };
  const dayLabels: Record<string, string> = {
    video_no_survey: "視聴完了からの経過日数",
    survey_no_booking: "回答からの経過日数",
    attended_no_application: "体験参加からの経過日数",
  };

  return (
    <div>
      <PageHeader
        title="フォロー対象"
        description="自動抽出ルールに該当する見込み客へ、リマインドのメール/LINEを送信できます"
      />

      <div className="space-y-6">
        {FOLLOW_UP_RULES.map((rule) => {
          const rows = ruleRows[rule.key] ?? [];
          const unsent = rows.filter((r) => !sentSet.has(`${r.lead.id}:${rule.key}`));
          return (
            <Card
              key={rule.key}
              title={`${rule.label} (${rows.length}件)`}
              action={
                unsent.length > 0 ? (
                  <form action={sendFollowUpBulkAction}>
                    <input type="hidden" name="rule" value={rule.key} />
                    <input type="hidden" name="lead_ids" value={unsent.map((r) => r.lead.id).join(",")} />
                    <button type="submit" className={btnPrimary}>
                      ✉️ 未送信の{unsent.length}件へ一括送信
                    </button>
                  </form>
                ) : rows.length > 0 ? (
                  <Badge tone="green">全件送信済</Badge>
                ) : undefined
              }
            >
              <p className="mb-3 text-xs text-gray-400">{rule.description}</p>
              {rows.length === 0 ? (
                <EmptyState message="該当するリードはいません" />
              ) : (
                <Table headers={["氏名", "ステータス", dayLabels[rule.key], "連絡先", "フォロー"]}>
                  {rows.map(({ lead, days }) => {
                    const sent = sentSet.has(`${lead.id}:${rule.key}`);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <Td>
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            {lead.name}
                          </Link>
                          {lead.kana && <p className="text-[11px] text-gray-400">{lead.kana}</p>}
                        </Td>
                        <Td>
                          <LeadStatusBadge status={lead.status} />
                        </Td>
                        <Td>
                          <span className={`font-semibold ${days >= 14 ? "text-red-600" : "text-gray-700"}`}>
                            {days}日
                          </span>
                        </Td>
                        <Td>
                          <p className="text-xs text-gray-600">{lead.email ?? "メールなし"}</p>
                          <p className="text-[11px] text-gray-400">
                            {lead.line_id ? `LINE: ${lead.line_id}` : "LINEなし"}
                          </p>
                        </Td>
                        <Td>
                          {sent ? (
                            <Badge tone="green">送信済 ✓</Badge>
                          ) : lead.email || lead.line_id ? (
                            <form action={sendFollowUpAction}>
                              <input type="hidden" name="lead_id" value={lead.id} />
                              <input type="hidden" name="rule" value={rule.key} />
                              <button type="submit" className={btnSmall}>
                                ✉️ フォロー送信
                              </button>
                            </form>
                          ) : (
                            <Badge tone="gray">連絡先なし</Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
