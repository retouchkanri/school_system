import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/supabase/admin";
import { fmtDate, toDateInput, daysAgo, fmtYen } from "@/lib/format";
import {
  ATTENDANCE_STATUS_LABELS, APPROVAL_STATUS_LABELS, MEAL_LABELS,
  CAREER_OUTCOME_LABELS, REIMBURSEMENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  Card, PageHeader, Badge, BackLink, InfoRow, EmptyState, type BadgeTone,
} from "@/components/ui";
import type {
  Student, Horse, AttendanceRecord, RidingReport, TrainingRecord,
  OvernightLeaveRequest, MealRecord, AttendanceStatus, ApprovalStatus, StudentState, MealType,
  GradeRecord, CompetencyAssessment, CareerRecord, Reimbursement, CareerOutcomeType, ReimbursementStatus,
} from "@/lib/types";
import StudentEditForm, { type AccountOption, type HorseOption } from "./edit-form";

const STATE_LABELS: Record<StudentState, string> = {
  enrolled: "在籍",
  graduated: "卒業",
  withdrawn: "退学",
};

const STATE_TONES: Record<StudentState, BadgeTone> = {
  enrolled: "green",
  graduated: "blue",
  withdrawn: "gray",
};

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "green",
  absent: "red",
  late: "amber",
  early_leave: "blue",
};

const APPROVAL_TONES: Record<ApprovalStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];

const OUTCOME_TONES: Record<CareerOutcomeType, BadgeTone> = {
  employment: "green",
  further_education: "blue",
  other: "gray",
};

const REIMBURSEMENT_TONES: Record<ReimbursementStatus, BadgeTone> = {
  pending: "amber",
  notified: "blue",
  paid: "green",
};

type StudentDetail = Student & { horse: Horse | null };
type ReportRow = RidingReport & { horse: Pick<Horse, "name" | "is_retouch"> | null };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const db = adminDb();

  const { data: studentData } = await db
    .from("students")
    .select("*, horse:horses(*)")
    .eq("id", id)
    .maybeSingle();
  if (!studentData) notFound();
  const student = studentData as StudentDetail;

  const attendanceFrom = toDateInput(daysAgo(13));
  const mealsFrom = toDateInput(daysAgo(6));

  const [
    { data: attendanceData },
    { data: reportsData },
    { data: trainingsData },
    { data: overnightData },
    { data: mealsData },
    { data: horsesData },
    { data: gradesData },
    { data: competencyData },
    { data: careerData },
    { data: reimbursementsData },
    { data: accountsData },
  ] = await Promise.all([
    db.from("attendance_records").select("*").eq("student_id", id).gte("date", attendanceFrom).order("date", { ascending: false }),
    db.from("riding_reports").select("*, horse:horses(name, is_retouch)").eq("student_id", id).order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    db.from("training_records").select("*").eq("student_id", id).order("date", { ascending: false }),
    db.from("overnight_leave_requests").select("*").eq("student_id", id).order("start_date", { ascending: false }),
    db.from("meal_records").select("*").eq("student_id", id).gte("date", mealsFrom),
    db.from("horses").select("*").order("name", { ascending: true }),
    db.from("grade_records").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(5),
    db.from("competency_assessments").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(1),
    db.from("career_records").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    db.from("reimbursements").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(5),
    db.from("profiles").select("id, full_name, email, role").in("role", ["student", "parent"]).order("full_name", { ascending: true }),
  ]);

  const attendance = (attendanceData ?? []) as AttendanceRecord[];
  const reports = (reportsData ?? []) as ReportRow[];
  const trainings = (trainingsData ?? []) as TrainingRecord[];
  const overnights = (overnightData ?? []) as OvernightLeaveRequest[];
  const meals = (mealsData ?? []) as MealRecord[];
  const horses = (horsesData ?? []) as Horse[];
  const grades = (gradesData ?? []) as GradeRecord[];
  const latestCompetency = ((competencyData ?? []) as CompetencyAssessment[])[0] ?? null;
  const careerRecords = (careerData ?? []) as CareerRecord[];
  const reimbursements = (reimbursementsData ?? []) as Reimbursement[];
  const horseOptions: HorseOption[] = horses.map((h) => ({ id: h.id, name: h.name, is_retouch: h.is_retouch }));
  const accounts = (accountsData ?? []) as { id: string; full_name: string; email: string | null; role: string }[];
  const toAccountOption = (a: { id: string; full_name: string; email: string | null }): AccountOption => ({
    id: a.id,
    label: a.email ? `${a.full_name} (${a.email})` : a.full_name,
  });
  const studentAccounts = accounts.filter((a) => a.role === "student").map(toAccountOption);
  const parentAccounts = accounts.filter((a) => a.role === "parent").map(toAccountOption);

  // 連携済みプロフィールのロールが変わっていても選択肢に必ず含める
  // (含めないと defaultValue が一致せず、無関係な保存操作で連携が黙って外れてしまう)
  for (const [linkedId, list] of [
    [student.user_id, studentAccounts],
    [student.parent_user_id, parentAccounts],
  ] as const) {
    if (linkedId && !list.some((a) => a.id === linkedId)) {
      const { data: missing } = await db.from("profiles").select("id, full_name, email").eq("id", linkedId).maybeSingle();
      const m = missing as { id: string; full_name: string; email: string | null } | null;
      list.unshift(m ? { ...toAccountOption(m), label: `${toAccountOption(m).label} (現在の連携)` } : { id: linkedId, label: "(現在の連携アカウント)" });
    }
  }

  const mealMap = new Map<string, boolean>();
  for (const m of meals) mealMap.set(`${m.date}_${m.meal}`, m.eaten);
  const mealDays: string[] = [];
  for (let i = 0; i < 7; i++) mealDays.push(toDateInput(daysAgo(i)));

  return (
    <div>
      <BackLink href="/admin/students" label="生徒一覧へ戻る" />
      <PageHeader
        title={student.name}
        description={`${student.student_number}${student.kana ? ` / ${student.kana}` : ""}`}
        action={<Badge tone={STATE_TONES[student.status]}>{STATE_LABELS[student.status]}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左カラム: 基本情報・担当馬・編集 */}
        <div className="space-y-6">
          <Card title="基本情報">
            <dl>
              <InfoRow label="学籍番号" value={student.student_number} />
              <InfoRow label="氏名" value={student.name} />
              <InfoRow label="フリガナ" value={student.kana ?? "—"} />
              <InfoRow label="クラス" value={student.class_name ?? "—"} />
              <InfoRow label="寮部屋" value={student.dorm_room ?? "—"} />
              <InfoRow label="入学日" value={fmtDate(student.enrollment_date)} />
              <InfoRow label="在籍状況" value={<Badge tone={STATE_TONES[student.status]}>{STATE_LABELS[student.status]}</Badge>} />
            </dl>
          </Card>

          <Card title="担当馬">
            {student.horse ? (
              <dl>
                <InfoRow
                  label="馬名"
                  value={
                    <span>
                      {student.horse.name}
                      {student.horse.is_retouch && (
                        <span className="ml-1">
                          <Badge tone="purple">リタッチ</Badge>
                        </span>
                      )}
                    </span>
                  }
                />
                <InfoRow label="品種" value={student.horse.breed ?? "—"} />
                <InfoRow label="年齢" value={student.horse.age != null ? `${student.horse.age}歳` : "—"} />
                <InfoRow label="馬の馬房" value={student.horse.stall ?? "—"} />
                <InfoRow label="配属馬房" value={student.stall_number ?? "—"} />
              </dl>
            ) : (
              <EmptyState message="担当馬が割り当てられていません" />
            )}
          </Card>

          <Card title="情報の編集">
            <StudentEditForm
              student={{
                id: student.id,
                name: student.name,
                kana: student.kana,
                student_number: student.student_number,
                enrollment_date: student.enrollment_date,
                class_name: student.class_name,
                dorm_room: student.dorm_room,
                assigned_horse_id: student.assigned_horse_id,
                stall_number: student.stall_number,
                user_id: student.user_id,
                parent_user_id: student.parent_user_id,
                status: student.status,
              }}
              horses={horseOptions}
              studentAccounts={studentAccounts}
              parentAccounts={parentAccounts}
            />
          </Card>
        </div>

        {/* 右カラム: 出欠・食事・騎乗報告・研修・外泊 */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="直近の出欠 (14日)">
            {attendance.length === 0 ? (
              <EmptyState message="直近14日の出欠記録はありません" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendance.map((a) => (
                  <div key={a.id} className="border border-gray-100 bg-gray-50 px-3 py-2 text-center">
                    <p className="text-[11px] text-gray-500">{fmtDate(a.date)}</p>
                    <div className="mt-1">
                      <Badge tone={ATTENDANCE_TONES[a.status]}>{ATTENDANCE_STATUS_LABELS[a.status]}</Badge>
                    </div>
                    {a.note && <p className="mt-1 max-w-32 truncate text-[11px] text-gray-400" title={a.note}>{a.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="直近の食事状況 (7日)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-center text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">日付</th>
                    {MEAL_ORDER.map((m) => (
                      <th key={m} className="px-3 py-2 text-xs font-bold text-gray-500">{MEAL_LABELS[m]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mealDays.map((d) => (
                    <tr key={d}>
                      <td className="px-3 py-2 text-left text-xs text-gray-600">{fmtDate(d)}</td>
                      {MEAL_ORDER.map((m) => {
                        const eaten = mealMap.get(`${d}_${m}`);
                        return (
                          <td key={m} className="px-3 py-2">
                            {eaten === true ? (
                              <span className="font-bold text-emerald-600">○</span>
                            ) : eaten === false ? (
                              <span className="font-bold text-red-600">×</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="直近の騎乗報告 (5件)">
            {reports.length === 0 ? (
              <EmptyState message="騎乗報告はまだありません" />
            ) : (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{fmtDate(r.report_date)}</span>
                      {r.lesson && <span>{r.lesson}</span>}
                      {r.horse && (
                        <span className="text-gray-700">
                          {r.horse.name}
                          {r.horse.is_retouch && (
                            <span className="ml-1">
                              <Badge tone="purple">リタッチ</Badge>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-800">{r.content}</p>
                    {r.horse_condition && (
                      <p className="mt-1 text-xs text-gray-500">馬の状態: {r.horse_condition}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="研修履歴">
            {trainings.length === 0 ? (
              <EmptyState message="研修記録はまだありません" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {["日付", "研修名", "カテゴリ", "結果", "担当講師"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-bold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trainings.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{fmtDate(t.date)}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{t.title}</td>
                        <td className="px-3 py-2">{t.category ? <Badge tone="blue">{t.category}</Badge> : "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{t.result ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{t.instructor ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="外泊届履歴">
            {overnights.length === 0 ? (
              <EmptyState message="外泊届はまだありません" />
            ) : (
              <ul className="space-y-3">
                {overnights.map((o) => (
                  <li key={o.id} className="border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {fmtDate(o.start_date)} 〜 {fmtDate(o.end_date)}
                      </span>
                      <Badge tone={APPROVAL_TONES[o.parent_approval]}>
                        {APPROVAL_STATUS_LABELS[o.parent_approval]}
                      </Badge>
                      {o.staff_acknowledged ? <Badge tone="green">職員確認済</Badge> : <Badge tone="gray">職員未確認</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-700">行き先: {o.destination}</p>
                    {o.reason && <p className="text-xs text-gray-500">理由: {o.reason}</p>}
                    {o.parent_comment && <p className="text-xs text-gray-500">保護者コメント: {o.parent_comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="成績 (最新5件)">
            {grades.length === 0 ? (
              <EmptyState message="成績記録はまだありません" />
            ) : (
              <ul className="space-y-2">
                {grades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {g.term} / {g.subject}
                    </span>
                    <span className="flex items-center gap-2">
                      {g.score != null && <span className="text-sm font-semibold text-gray-800">{g.score}点</span>}
                      {g.evaluation && <Badge tone="blue">{g.evaluation}</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="社会人基礎力評価 (最新)">
            {!latestCompetency ? (
              <EmptyState message="評価記録はまだありません" />
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{latestCompetency.term}</span>
                  <span className="text-xs text-gray-400">{fmtDate(latestCompetency.created_at)}</span>
                </div>
                {latestCompetency.growth_comment && (
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{latestCompetency.growth_comment}</p>
                )}
              </div>
            )}
          </Card>

          <Card title="進路">
            {careerRecords.length === 0 ? (
              <EmptyState message="進路はまだ決定していません" />
            ) : (
              <ul className="space-y-2">
                {careerRecords.map((c) => (
                  <li key={c.id} className="border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={OUTCOME_TONES[c.outcome_type]}>{CAREER_OUTCOME_LABELS[c.outcome_type]}</Badge>
                      <span className="text-sm font-semibold text-gray-800">{c.organization}</span>
                    </div>
                    {c.position && <p className="mt-1 text-xs text-gray-500">{c.position}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="諸経費 (最新5件)">
            {reimbursements.length === 0 ? (
              <EmptyState message="諸経費の記録はまだありません" />
            ) : (
              <ul className="space-y-2">
                {reimbursements.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-700">{r.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{fmtYen(r.amount)}</span>
                      <Badge tone={REIMBURSEMENT_TONES[r.status]}>{REIMBURSEMENT_STATUS_LABELS[r.status]}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
