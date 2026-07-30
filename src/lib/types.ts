export type UserRole = "admin" | "applicant" | "student" | "parent" | "supporter";

export type LeadStatus =
  | "material_requested"
  | "material_sent"
  | "video_watched"
  | "survey_answered"
  | "ai_judged"
  | "visit_reserved"
  | "payment_confirmed"
  | "visit_attended"
  | "exp_survey_answered"
  | "applied"
  | "aptitude_done"
  | "interview"
  | "decision_sent"
  | "enrollment_procedure"
  | "admission_fee_paid"
  | "uniform_ordered"
  | "dorm_ready"
  | "enrolled";

export type VideoStatus = "unwatched" | "in_progress" | "completed";
export type AiJudgement = "approved" | "caution" | "rejected";
export type BookingStatus = "reserved" | "attended" | "cancelled" | "no_show";
export type PaymentMethod = "credit_card" | "bank_transfer";
export type PaymentStatus = "pending" | "paid" | "confirmed" | "refunded" | "cancelled";
export type PaymentType = "open_campus" | "admission_fee" | "uniform" | "materials" | "tuition";
export type RespondentType = "student" | "parent";
export type ApplicationStatus = "draft" | "submitted" | "under_review" | "interview_scheduled" | "decided";
export type AdmissionResult = "accepted" | "rejected" | "waitlist";
export type ProcedureStatus = "not_started" | "in_progress" | "completed";
export type AudienceType = "enrollee" | "student" | "parent" | "supporter" | "all";
export type AttendanceStatus = "present" | "absent" | "late" | "early_leave";
export type MealType = "breakfast" | "lunch" | "dinner";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AbsenceRequestStatus = "pending" | "acknowledged" | "rejected";
export type StudentState = "enrolled" | "graduated" | "withdrawn";
export type NotifyChannel = "email" | "line";
export type CareerOutcomeType = "employment" | "further_education" | "other";
export type ReimbursementStatus = "pending" | "notified" | "paid";
export type InsuranceClaimStatus = "draft" | "submitted" | "reviewing" | "approved" | "rejected" | "paid";
/** 馬の入退記録の種別 */
export type HorseMovementKind = "arrival" | "departure" | "transfer" | "return";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  line_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Horse {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  stall: string | null;
  is_retouch: boolean;
  photo_url: string | null;
  notes: string | null;
  /** 性別: 牡 / 牝 / 騸 */
  sex: string | null;
  /** 毛色 */
  color: string | null;
  birth_date: string | null;
  /** マイクロチップ番号 */
  microchip: string | null;
  /** 馬主・所有者 */
  owner: string | null;
  /** 来場日 */
  arrived_on: string | null;
  /** 退場日 */
  departed_on: string | null;
  /** 在厩中か */
  active: boolean;
  insurance_company: string | null;
  insurance_expires_on: string | null;
  created_at: string;
}

/** 馬の入退記録 (入厩・退厩・移動・返還) */
export interface HorseMovement {
  id: string;
  horse_id: string;
  kind: HorseMovementKind;
  date: string;
  /** 相手先の牧場・クラブ名 */
  counterpart: string | null;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** 馬の予防接種歴 */
export interface HorseVaccination {
  id: string;
  horse_id: string;
  vaccine_name: string;
  date: string;
  next_due_date: string | null;
  veterinarian: string | null;
  lot_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** 馬の装蹄歴 */
export interface HorseFarrierRecord {
  id: string;
  horse_id: string;
  date: string;
  /** 全装 / 部分装蹄 / 削蹄 / 裸足 等 */
  kind: string | null;
  /** 装蹄師 */
  farrier: string | null;
  next_due_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  kana: string | null;
  grade: string | null;
  birth_date: string | null;
  gender: string | null;
  school_name: string | null;
  guardian_name: string | null;
  relationship: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  line_id: string | null;
  desired_course: string | null;
  interested_jobs: string[] | null;
  horse_experience: boolean;
  horse_experience_detail: string | null;
  referral_source: string | null;
  remarks: string | null;
  status: LeadStatus;
  material_sent_date: string | null;
  assigned_staff: string | null;
  user_id: string | null;
  ai_type: string | null;
  ai_summary: string | null;
  ai_judgement: AiJudgement | null;
  ai_enrollment_probability: number | null;
  ai_enrollment_summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoProgress {
  id: string;
  lead_id: string;
  video_title: string;
  status: VideoStatus;
  progress_percent: number;
  updated_at: string;
}

export interface PreScreeningSurvey {
  id: string;
  lead_id: string;
  answers: Record<string, string>;
  submitted_at: string;
}

export interface OpenCampusEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  capacity: number;
  fee: number;
  description: string | null;
  created_at: string;
}

export interface OpenCampusBooking {
  id: string;
  lead_id: string;
  event_id: string;
  status: BookingStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface ExperienceSurvey {
  id: string;
  lead_id: string;
  respondent: RespondentType;
  answers: Record<string, string>;
  submitted_at: string;
}

export interface ApplicationDocumentFile {
  path: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export interface Application {
  id: string;
  lead_id: string;
  documents: Record<string, ApplicationDocumentFile>;
  essay: string | null;
  status: ApplicationStatus;
  interview_date: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface AptitudeTest {
  id: string;
  lead_id: string;
  answers: Record<string, number>;
  scores: Record<string, number> | null;
  suitability: Record<string, number> | null;
  ai_report: string | null;
  completed_at: string;
}

export interface AdmissionDecision {
  id: string;
  lead_id: string;
  result: AdmissionResult;
  notified_via: string[];
  documents_sent: Record<string, boolean>;
  ai_probability: number | null;
  ai_summary: string | null;
  amended_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface EnrollmentProcedure {
  id: string;
  lead_id: string;
  photo_submitted: boolean;
  insurance_card_submitted: boolean;
  my_number_submitted: boolean;
  document_files: Record<string, ApplicationDocumentFile>;
  uniform_size: string | null;
  boots_size: string | null;
  helmet_size: string | null;
  drivers_license: boolean;
  emergency_contacts: { name: string; relation: string; phone: string }[];
  guarantor: { name?: string; relation?: string; phone?: string; address?: string };
  allergies: string | null;
  medications: string | null;
  medical_conditions: string | null;
  agreement_accepted: boolean;
  signature: string | null;
  signed_at: string | null;
  status: ProcedureStatus;
  updated_at: string;
}

export interface Payment {
  id: string;
  lead_id: string | null;
  student_id: string | null;
  booking_id: string | null;
  type: PaymentType;
  amount: number;
  method: PaymentMethod | null;
  status: PaymentStatus;
  paid_at: string | null;
  confirmed_by: string | null;
  /** 納付期限 */
  due_date: string | null;
  /** 分納の回次ラベル (例: 前期 / 第1回) */
  installment_label: string | null;
  memo: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  audience: AudienceType;
  title: string;
  body: string;
  send_email: boolean;
  send_line: boolean;
  published_at: string;
  created_by: string | null;
}

export interface Student {
  id: string;
  user_id: string | null;
  parent_user_id: string | null;
  lead_id: string | null;
  student_number: string;
  name: string;
  kana: string | null;
  class_name: string | null;
  dorm_room: string | null;
  assigned_horse_id: string | null;
  stall_number: string | null;
  orientation_info: string | null;
  items_to_bring: string | null;
  dorm_info: string | null;
  class_schedule: string | null;
  uniform_status: string | null;
  info_sent_at: string | null;
  enrollment_date: string | null;
  status: StudentState;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface TrainingRecord {
  id: string;
  student_id: string;
  title: string;
  category: string | null;
  date: string;
  result: string | null;
  instructor: string | null;
  notes: string | null;
  created_at: string;
}

export interface RidingReport {
  id: string;
  student_id: string;
  horse_id: string;
  report_date: string;
  lesson: string | null;
  content: string;
  horse_condition: string | null;
  /** 落馬の有無 */
  fell_off: boolean;
  /** 乗りやすさ 1〜5 (null = 未回答) */
  rideability: number | null;
  /** 馬の機嫌・気性 (落ち着いていた / やや興奮 / 興奮していた 等) */
  horse_mood: string | null;
  /** ヒヤリハット・特記事項 */
  incident: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface OvernightLeaveRequest {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  destination: string;
  reason: string | null;
  parent_approval: ApprovalStatus;
  parent_comment: string | null;
  approved_at: string | null;
  staff_acknowledged: boolean;
  created_at: string;
}

/** 欠席・遅刻・早退の事前連絡 (生徒/保護者が提出 → 職員が受理・却下) */
export interface AbsenceRequest {
  id: string;
  student_id: string;
  date: string;
  kind: AttendanceStatus;
  reason: string;
  detail: string | null;
  submitted_by: string | null;
  submitted_role: string | null;
  status: AbsenceRequestStatus;
  staff_comment: string | null;
  handled_by: string | null;
  handled_at: string | null;
  reflected_to_attendance: boolean;
  created_at: string;
}

export interface MealRecord {
  id: string;
  student_id: string;
  date: string;
  meal: MealType;
  eaten: boolean;
  note: string | null;
  created_at: string;
}

export interface BulkMessage {
  id: string;
  audience: string;
  title: string;
  body: string;
  via_email: boolean;
  via_line: boolean;
  recipient_count: number;
  sent_by: string | null;
  sent_at: string;
}

export interface Notification {
  id: string;
  channel: NotifyChannel;
  recipient: string;
  title: string;
  body: string | null;
  related_type: string | null;
  sent_at: string;
}

export interface StudentSurvey {
  id: string;
  title: string;
  description: string | null;
  target: string;
  questions: { id: string; text: string; type: string; options?: string[] }[];
  active: boolean;
  created_at: string;
}

export interface StudentSurveyResponse {
  id: string;
  survey_id: string;
  student_id: string;
  answers: Record<string, string>;
  submitted_at: string;
}

export interface HorseMonthlySummary {
  id: string;
  horse_id: string;
  year: number;
  month: number;
  summary: string;
  report_count: number;
  shared: boolean;
  created_at: string;
}

export interface Supporter {
  id: string;
  user_id: string | null;
  horse_id: string;
  name: string;
  since: string | null;
  created_at: string;
}

export interface FollowUpLog {
  id: string;
  lead_id: string;
  rule: string;
  channel: NotifyChannel;
  automated: boolean;
  sent_at: string;
}

export interface FollowUpSetting {
  rule: string;
  auto_enabled: boolean;
  min_days: number;
  last_run_at: string | null;
  last_sent_count: number;
  updated_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface GradeRecord {
  id: string;
  student_id: string;
  term: string;
  subject: string;
  score: number | null;
  evaluation: string | null;
  comment: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface CompetencyAssessment {
  id: string;
  student_id: string;
  term: string;
  scores: Record<string, number>;
  growth_comment: string | null;
  overall_comment: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface CareerRecord {
  id: string;
  student_id: string;
  outcome_type: CareerOutcomeType;
  organization: string;
  position: string | null;
  decided_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  student_id: string;
  title: string;
  amount: number;
  status: ReimbursementStatus;
  notes: string | null;
  notified_at: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** 怪我記録 (職員が記録。本人・保護者は閲覧のみ) */
export interface InjuryRecord {
  id: string;
  student_id: string;
  date: string;
  /** 発生場面: 騎乗中 / 厩舎作業中 / 授業中 / 寮生活 / その他 */
  occurred_at: string | null;
  /** 関連する馬 (任意) */
  horse_id: string | null;
  body_part: string | null;
  description: string;
  /** 軽傷 / 通院 / 入院 / その他 */
  severity: string | null;
  /** 応急処置・処置内容 */
  treatment: string | null;
  /** 受診先 */
  hospital: string | null;
  doctor_note: string | null;
  recorded_by: string | null;
  created_at: string;
}

/** 保険申請 (本人・保護者が提出 → 職員が処理) */
export interface InsuranceClaim {
  id: string;
  injury_record_id: string | null;
  student_id: string;
  /** 'student' | 'parent' */
  claimant_role: string | null;
  submitted_by: string | null;
  status: InsuranceClaimStatus;
  insurance_company: string | null;
  claim_amount: number | null;
  incident_summary: string;
  /** アップロードした書類のストレージパス配列 */
  documents: string[];
  staff_comment: string | null;
  handled_by: string | null;
  handled_at: string | null;
  paid_at: string | null;
  created_at: string;
}

/** 共有写真 (student_id が null なら全体公開) */
export interface SharedPhoto {
  id: string;
  title: string;
  description: string | null;
  taken_on: string | null;
  student_id: string | null;
  /** 'student' | 'parent' | 'both' */
  audience: string;
  /** ストレージ (student-photos バケット) のパス配列 */
  files: string[];
  created_by: string | null;
  notified_at: string | null;
  created_at: string;
}
