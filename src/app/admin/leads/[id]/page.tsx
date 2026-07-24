import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, fmtDateTime, fmtYen } from "@/lib/format";
import {
  VIDEO_STATUS_LABELS,
  AI_JUDGEMENT_LABELS,
  AI_JUDGEMENT_MESSAGES,
  BOOKING_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  APPLICATION_STATUS_LABELS,
  ADMISSION_RESULT_LABELS,
  PROCEDURE_STATUS_LABELS,
  PRE_SCREENING_QUESTIONS,
  POST_VISIT_QUESTIONS,
  APPLICATION_DOCUMENTS,
  DECISION_DOCUMENTS,
  APTITUDE_TRAITS,
  SUITABILITY_LABELS,
  progressTitle,
} from "@/lib/constants";
import {
  Card,
  Badge,
  LeadStatusBadge,
  ProgressTracker,
  BackLink,
  InfoRow,
  EmptyState,
} from "@/components/ui";
import type {
  Lead,
  Profile,
  VideoProgress,
  PreScreeningSurvey,
  OpenCampusBooking,
  OpenCampusEvent,
  ExperienceSurvey,
  Application,
  AptitudeTest,
  AdmissionDecision,
  EnrollmentProcedure,
  Payment,
  BookingStatus,
  PaymentStatus,
  AiJudgement,
} from "@/lib/types";
import type { BadgeTone } from "@/components/ui";
import { LeadAdminForm, AiJudgeButton, NotesForm, CreateAccountButton } from "./lead-forms";

type BookingWithEvent = OpenCampusBooking & { open_campus_events: OpenCampusEvent | null };

const bookingTone: Record<BookingStatus, BadgeTone> = {
  reserved: "blue",
  attended: "green",
  cancelled: "gray",
  no_show: "red",
};
const paymentTone: Record<PaymentStatus, BadgeTone> = {
  pending: "amber",
  paid: "blue",
  confirmed: "green",
  refunded: "gray",
  cancelled: "gray",
};
const judgementTone: Record<AiJudgement, BadgeTone> = {
  approved: "green",
  caution: "amber",
  rejected: "red",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
        <div className="h-3 rounded bg-brand-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-bold text-gray-700">{value}</span>
    </div>
  );
}

function AnswerList({
  questions,
  answers,
}: {
  questions: { id: string; text: string; type?: string }[];
  answers: Record<string, string>;
}) {
  return (
    <dl className="space-y-2">
      {questions.map((q) => {
        const raw = answers[q.id]?.trim() ?? "";
        const value =
          q.type === "stars" && raw
            ? "★".repeat(Math.max(0, Math.min(5, Number(raw)))) + "☆".repeat(5 - Math.max(0, Math.min(5, Number(raw))))
            : raw || "—";
        return (
          <div key={q.id} className="rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-[11px] font-semibold text-gray-500">{q.text}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-800">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const db = adminDb();

  const { data: leadData } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  const lead = leadData as Lead | null;
  if (!lead) notFound();

  const [
    { data: staffData },
    { data: videosData },
    { data: surveyData },
    { data: bookingsData },
    { data: expData },
    { data: appData },
    { data: aptData },
    { data: decisionData },
    { data: procedureData },
    { data: paymentsData },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("role", "admin").order("full_name"),
    db.from("video_progress").select("*").eq("lead_id", id).order("video_title"),
    db.from("pre_screening_surveys").select("*").eq("lead_id", id).maybeSingle(),
    db.from("open_campus_bookings").select("*, open_campus_events(*)").eq("lead_id", id).order("created_at"),
    db.from("experience_surveys").select("*").eq("lead_id", id),
    db.from("applications").select("*").eq("lead_id", id).maybeSingle(),
    db.from("aptitude_tests").select("*").eq("lead_id", id).maybeSingle(),
    db.from("admission_decisions").select("*").eq("lead_id", id).maybeSingle(),
    db.from("enrollment_procedures").select("*").eq("lead_id", id).maybeSingle(),
    db.from("payments").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  const staff = (staffData ?? []) as Profile[];
  const videos = (videosData ?? []) as VideoProgress[];
  const survey = surveyData as PreScreeningSurvey | null;
  const bookings = (bookingsData ?? []) as BookingWithEvent[];
  const expSurveys = (expData ?? []) as ExperienceSurvey[];
  const application = appData as Application | null;
  const aptitude = aptData as AptitudeTest | null;
  const decision = decisionData as AdmissionDecision | null;
  const procedure = procedureData as EnrollmentProcedure | null;
  const payments = (paymentsData ?? []) as Payment[];

  const postVisitSurvey = expSurveys[0] ?? null;

  return (
    <div>
      <BackLink href="/admin/leads" label="リード一覧へ戻る" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
        {lead.kana && <span className="text-sm text-gray-400">({lead.kana})</span>}
        <LeadStatusBadge status={lead.status} />
        <span className="ml-auto text-xs text-gray-400">登録日: {fmtDate(lead.created_at)}</span>
      </div>

      <Card title={progressTitle(lead.status)}>
        <ProgressTracker status={lead.status} />
      </Card>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {/* ===== 左カラム ===== */}
        <div className="space-y-6">
          <Card title="基本情報">
            <dl>
              <InfoRow label="フリガナ" value={lead.kana ?? "—"} />
              <InfoRow label="続柄" value={lead.relationship ?? "—"} />
              <InfoRow label="学年" value={lead.grade ?? "—"} />
              <InfoRow label="生年月日" value={fmtDate(lead.birth_date)} />
              <InfoRow label="性別" value={lead.gender ?? "—"} />
              <InfoRow label="学校名" value={lead.school_name ?? "—"} />
              <InfoRow label="保護者氏名" value={lead.guardian_name ?? "—"} />
              <InfoRow
                label="住所"
                value={
                  lead.postal_code || lead.address
                    ? `${lead.postal_code ? `〒${lead.postal_code} ` : ""}${lead.address ?? ""}`
                    : "—"
                }
              />
              <InfoRow label="電話番号" value={lead.phone ?? "—"} />
              <InfoRow label="メール" value={lead.email ?? "—"} />
              <InfoRow label="LINE ID" value={lead.line_id ?? "—"} />
              <InfoRow label="希望学科" value={lead.desired_course ?? "—"} />
              <InfoRow
                label="興味のある仕事"
                value={lead.interested_jobs && lead.interested_jobs.length > 0 ? lead.interested_jobs.join("、") : "—"}
              />
              <InfoRow
                label="馬経験"
                value={
                  lead.horse_experience
                    ? `あり${lead.horse_experience_detail ? ` (${lead.horse_experience_detail})` : ""}`
                    : "なし"
                }
              />
              <InfoRow label="何を見て知ったか" value={lead.referral_source ?? "—"} />
              <InfoRow label="備考(ご本人記入)" value={lead.remarks ?? "—"} />
              <InfoRow label="登録日" value={fmtDateTime(lead.created_at)} />
            </dl>
          </Card>

          <Card title="動画視聴状況">
            {videos.length === 0 ? (
              <EmptyState message="視聴データはまだありません" />
            ) : (
              <div className="space-y-3">
                {videos.map((v) => (
                  <div key={v.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700">{v.video_title}</span>
                      <Badge tone={v.status === "completed" ? "green" : v.status === "in_progress" ? "amber" : "gray"}>
                        {VIDEO_STATUS_LABELS[v.status]}
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-brand-500"
                        style={{ width: `${Math.max(0, Math.min(100, v.progress_percent))}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[11px] text-gray-400">
                      {v.progress_percent}% ・ 最終更新 {fmtDate(v.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="入学仮審査アンケート・AI判定">
            {lead.ai_judgement ? (
              <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={judgementTone[lead.ai_judgement]}>{AI_JUDGEMENT_LABELS[lead.ai_judgement]}</Badge>
                  {lead.ai_type && <span className="text-sm font-bold text-brand-700">{lead.ai_type}</span>}
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-800">{AI_JUDGEMENT_MESSAGES[lead.ai_judgement]}</p>
                {lead.ai_summary && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{lead.ai_summary}</p>
                )}
              </div>
            ) : survey ? (
              <div className="mb-4">
                <AiJudgeButton leadId={lead.id} />
              </div>
            ) : null}

            {survey ? (
              <>
                <p className="mb-2 text-xs text-gray-400">回答日時: {fmtDateTime(survey.submitted_at)}</p>
                <AnswerList questions={PRE_SCREENING_QUESTIONS} answers={survey.answers} />
              </>
            ) : (
              <EmptyState message="仮審査アンケートは未回答です" />
            )}
          </Card>

          <Card title="学校見学後アンケート・入学確率">
            {lead.ai_enrollment_probability != null && (
              <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-4 text-center">
                <p className="text-xs font-semibold text-brand-600">AI予測</p>
                <p className="mt-1 text-3xl font-bold text-brand-700">入学確率 {lead.ai_enrollment_probability}%</p>
              </div>
            )}
            {!postVisitSurvey ? (
              <EmptyState message="学校見学後アンケートは未回答です" />
            ) : (
              <div>
                <p className="mb-2 text-xs font-bold text-gray-500">
                  回答日時 ({fmtDateTime(postVisitSurvey.submitted_at)})
                </p>
                <AnswerList questions={POST_VISIT_QUESTIONS} answers={postVisitSurvey.answers} />
              </div>
            )}
          </Card>
        </div>

        {/* ===== 右カラム ===== */}
        <div className="space-y-6">
          <Card title="管理 (資料送付・ステータス・担当者)">
            <LeadAdminForm lead={lead} staff={staff} />
          </Card>

          <Card title="マイページアカウント">
            {lead.user_id ? (
              <div className="flex items-center gap-2">
                <Badge tone="green">発行済み</Badge>
                <span className="text-sm text-gray-600">{lead.email ?? ""}</span>
              </div>
            ) : lead.email ? (
              <CreateAccountButton leadId={lead.id} />
            ) : (
              <EmptyState message="メールアドレスが未登録のため発行できません" />
            )}
          </Card>

          <Card title="見学・オープンキャンパス予約">
            {bookings.length === 0 ? (
              <EmptyState message="予約はまだありません" />
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {b.open_campus_events?.title ?? "イベント"}
                      </p>
                      <Badge tone={bookingTone[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      開催日: {fmtDate(b.open_campus_events?.event_date)}
                      {b.open_campus_events?.start_time ? ` ${b.open_campus_events.start_time}` : ""} ・ 参加費:{" "}
                      {fmtYen(b.open_campus_events?.fee)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      支払方法: {b.payment_method ? PAYMENT_METHOD_LABELS[b.payment_method] : "未選択"}
                      <Badge tone={paymentTone[b.payment_status]}>{PAYMENT_STATUS_LABELS[b.payment_status]}</Badge>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="出願・適性検査">
            {!application && !aptitude ? (
              <EmptyState message="出願はまだありません" />
            ) : (
              <div className="space-y-5">
                {application && (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">出願状況</span>
                      <Badge tone={application.status === "decided" ? "green" : "blue"}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Badge>
                      {application.submitted_at && (
                        <span className="text-xs text-gray-400">提出: {fmtDate(application.submitted_at)}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {APPLICATION_DOCUMENTS.map((d) => (
                        <Badge key={d.key} tone={application.documents[d.key] ? "green" : "gray"}>
                          {application.documents[d.key] ? "✓ " : ""}
                          {d.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">面接日: {fmtDate(application.interview_date)}</p>
                  </div>
                )}
                {aptitude && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-xs font-bold text-gray-500">
                      性格・適性検査 (実施: {fmtDate(aptitude.completed_at)})
                    </p>
                    {aptitude.scores && (
                      <div className="space-y-1.5">
                        {Object.entries(APTITUDE_TRAITS).map(([key, label]) => (
                          <ScoreBar key={key} label={label} value={aptitude.scores?.[key] ?? 0} />
                        ))}
                      </div>
                    )}
                    {aptitude.suitability && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-bold text-gray-500">職業適性</p>
                        {Object.entries(SUITABILITY_LABELS).map(([key, label]) => (
                          <ScoreBar key={key} label={label} value={aptitude.suitability?.[key] ?? 0} />
                        ))}
                      </div>
                    )}
                    {aptitude.ai_report && (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700">
                        {aptitude.ai_report}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="合否・入学手続き">
            {!decision && !procedure ? (
              <EmptyState message="合否通知・入学手続きはまだありません" />
            ) : (
              <div className="space-y-5">
                {decision && (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">合否</span>
                      <Badge
                        tone={
                          decision.result === "accepted" ? "green" : decision.result === "waitlist" ? "amber" : "red"
                        }
                      >
                        {ADMISSION_RESULT_LABELS[decision.result]}
                      </Badge>
                      {decision.notified_at && (
                        <span className="text-xs text-gray-400">通知日: {fmtDate(decision.notified_at)}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DECISION_DOCUMENTS.map((d) => (
                        <Badge key={d.key} tone={decision.documents_sent[d.key] ? "green" : "gray"}>
                          {decision.documents_sent[d.key] ? "✓ " : ""}
                          {d.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {procedure && (
                  <div className={decision ? "border-t border-gray-100 pt-4" : ""}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">入学手続き</span>
                      <Badge tone={procedure.status === "completed" ? "green" : procedure.status === "in_progress" ? "amber" : "gray"}>
                        {PROCEDURE_STATUS_LABELS[procedure.status]}
                      </Badge>
                    </div>
                    <dl className="mt-2">
                      <InfoRow label="顔写真" value={procedure.photo_submitted ? "提出済" : "未提出"} />
                      <InfoRow label="保険証" value={procedure.insurance_card_submitted ? "提出済" : "未提出"} />
                      <InfoRow label="マイナンバー" value={procedure.my_number_submitted ? "提出済" : "未提出"} />
                      <InfoRow
                        label="サイズ (制服/ブーツ/ヘルメット)"
                        value={`${procedure.uniform_size ?? "—"} / ${procedure.boots_size ?? "—"} / ${procedure.helmet_size ?? "—"}`}
                      />
                      <InfoRow
                        label="規約同意"
                        value={procedure.agreement_accepted ? `同意済 (${fmtDate(procedure.signed_at)})` : "未同意"}
                      />
                    </dl>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="決済">
            {payments.length === 0 ? (
              <EmptyState message="決済データはありません" />
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{PAYMENT_TYPE_LABELS[p.type]}</p>
                      <p className="text-xs text-gray-400">
                        {p.method ? PAYMENT_METHOD_LABELS[p.method] : "支払方法未選択"} ・ {fmtDate(p.paid_at ?? p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{fmtYen(p.amount)}</span>
                      <Badge tone={paymentTone[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="対応メモ">
            <NotesForm leadId={lead.id} notes={lead.notes} />
          </Card>
        </div>
      </div>
    </div>
  );
}
