import type {
  LeadStatus,
  AiJudgement,
  AttendanceStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  BookingStatus,
  ApplicationStatus,
  AdmissionResult,
  ProcedureStatus,
  ApprovalStatus,
  AudienceType,
  MealType,
  VideoStatus,
} from "@/lib/types";

/** 入学までの進捗ステップ (管理画面ダッシュボードの18項目) */
export const PROGRESS_STEPS: { key: LeadStatus; label: string }[] = [
  { key: "material_requested", label: "資料請求" },
  { key: "material_sent", label: "資料発送" },
  { key: "video_watched", label: "動画視聴" },
  { key: "survey_answered", label: "仮審査回答" },
  { key: "ai_judged", label: "AI判定" },
  { key: "visit_reserved", label: "見学予約" },
  { key: "payment_confirmed", label: "入金確認" },
  { key: "visit_attended", label: "体験参加" },
  { key: "exp_survey_answered", label: "アンケート" },
  { key: "applied", label: "出願" },
  { key: "aptitude_done", label: "性格診断" },
  { key: "interview", label: "面接" },
  { key: "decision_sent", label: "合否通知" },
  { key: "enrollment_procedure", label: "入学手続き" },
  { key: "admission_fee_paid", label: "入学金確認" },
  { key: "uniform_ordered", label: "制服注文" },
  { key: "dorm_ready", label: "入寮準備" },
  { key: "enrolled", label: "入学式" },
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = Object.fromEntries(
  PROGRESS_STEPS.map((s) => [s.key, s.label])
) as Record<LeadStatus, string>;

export function statusIndex(status: LeadStatus): number {
  return PROGRESS_STEPS.findIndex((s) => s.key === status);
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  unwatched: "未視聴",
  in_progress: "視聴途中",
  completed: "視聴完了",
};

export const AI_JUDGEMENT_LABELS: Record<AiJudgement, string> = {
  approved: "○ 参加可能",
  caution: "△ 要相談",
  rejected: "× 見送り",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  reserved: "予約済",
  attended: "参加済",
  cancelled: "キャンセル",
  no_show: "不参加",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: "クレジットカード",
  bank_transfer: "銀行振込",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "未入金",
  paid: "決済済",
  confirmed: "入金確認済",
  refunded: "返金済",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  open_campus: "オープンキャンパス参加費",
  admission_fee: "入学金",
  uniform: "制服代",
  materials: "教材費",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "下書き",
  submitted: "提出済",
  under_review: "審査中",
  interview_scheduled: "面接日程確定",
  decided: "判定済",
};

export const ADMISSION_RESULT_LABELS: Record<AdmissionResult, string> = {
  accepted: "合格",
  rejected: "不合格",
  waitlist: "補欠",
};

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatus, string> = {
  not_started: "未着手",
  in_progress: "入力中",
  completed: "完了",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "承認待ち",
  approved: "承認済",
  rejected: "却下",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "出席",
  absent: "欠席",
  late: "遅刻",
  early_leave: "早退",
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
};

export const AUDIENCE_LABELS: Record<AudienceType, string> = {
  enrollee: "入学決定者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
  all: "全体",
};

export const GRADES = ["中学1年", "中学2年", "中学3年", "高校1年", "高校2年", "高校3年", "既卒・社会人"];

export const COURSES = ["東関東馬事高等学院(高等課程)", "東関東馬事専門学院(専門課程)"];

export const INTERESTED_JOBS = [
  "騎手",
  "厩務員",
  "牧場スタッフ",
  "乗馬インストラクター",
  "調教師",
  "装蹄師",
  "獣医・動物看護",
  "その他",
];

export const REFERRAL_SOURCES = [
  "インターネット検索",
  "Instagram",
  "TikTok",
  "YouTube",
  "知人・紹介",
  "雑誌・新聞",
  "テレビ",
  "イベント",
  "その他",
];

export const UNIFORM_SIZES = ["S", "M", "L", "LL", "3L"];
export const BOOTS_SIZES = ["23.0", "23.5", "24.0", "24.5", "25.0", "25.5", "26.0", "26.5", "27.0", "27.5", "28.0"];
export const HELMET_SIZES = ["S (54-56cm)", "M (56-58cm)", "L (58-60cm)", "XL (60-62cm)"];

/** ステップ2: 入学仮審査アンケート設問 */
export type SurveyQuestion = {
  id: string;
  text: string;
  type: "text" | "textarea" | "choice";
  options?: string[];
};

export const PRE_SCREENING_QUESTIONS: SurveyQuestion[] = [
  { id: "q1", text: "なぜ馬の学校へ入りたいですか", type: "textarea" },
  { id: "q2", text: "将来の夢を教えてください", type: "textarea" },
  { id: "q3", text: "動物は好きですか", type: "choice", options: ["とても好き", "好き", "普通", "少し苦手"] },
  { id: "q4", text: "集団生活はできますか", type: "choice", options: ["できる", "たぶんできる", "不安がある"] },
  { id: "q5", text: "寮生活は問題ありませんか", type: "choice", options: ["問題ない", "少し不安", "不安が大きい"] },
  { id: "q6", text: "朝は苦手ですか", type: "choice", options: ["得意", "普通", "苦手"] },
  { id: "q7", text: "保護者は賛成していますか", type: "choice", options: ["賛成している", "どちらともいえない", "反対している"] },
  { id: "q8", text: "今まで不登校の経験はありますか", type: "choice", options: ["ない", "ある"] },
  { id: "q9", text: "心配していることがあれば教えてください", type: "textarea" },
  { id: "q10", text: "健康状態について教えてください", type: "choice", options: ["良好", "配慮が必要な点がある"] },
  { id: "q11", text: "アレルギーはありますか", type: "text" },
  { id: "q12", text: "精神的な配慮事項があれば教えてください", type: "text" },
  { id: "q13", text: "趣味を教えてください", type: "text" },
  { id: "q14", text: "得意なことを教えてください", type: "text" },
  { id: "q15", text: "苦手なことを教えてください", type: "text" },
  { id: "q16", text: "学校生活で頑張りたいことを教えてください", type: "textarea" },
];

/** ステップ4: 体験終了アンケート (本人) */
export const EXPERIENCE_QUESTIONS_STUDENT: SurveyQuestion[] = [
  { id: "s1", text: "体験は楽しかったですか", type: "choice", options: ["とても楽しかった", "楽しかった", "普通", "あまり楽しくなかった"] },
  { id: "s2", text: "馬はもっと好きになりましたか", type: "choice", options: ["とても好きになった", "好きになった", "変わらない"] },
  { id: "s3", text: "寮生活はできそうですか", type: "choice", options: ["できそう", "たぶんできそう", "不安"] },
  { id: "s4", text: "入学したいと思いましたか", type: "choice", options: ["ぜひ入学したい", "入学したい", "迷っている", "考え中"] },
  { id: "s5", text: "感想を自由にお書きください", type: "textarea" },
];

/** ステップ4: 体験終了アンケート (保護者) */
export const EXPERIENCE_QUESTIONS_PARENT: SurveyQuestion[] = [
  { id: "p1", text: "学院の環境・雰囲気に安心できましたか", type: "choice", options: ["とても安心できた", "安心できた", "普通", "不安が残る"] },
  { id: "p2", text: "教育方針に共感できましたか", type: "choice", options: ["とても共感できた", "共感できた", "普通", "疑問がある"] },
  { id: "p3", text: "スタッフの対応はいかがでしたか", type: "choice", options: ["とても良かった", "良かった", "普通", "改善してほしい"] },
  { id: "p4", text: "学費についてのご不安はありますか", type: "choice", options: ["特にない", "少しある", "大きくある"] },
  { id: "p5", text: "ご意見・ご要望をお聞かせください", type: "textarea" },
];

/** 出願時の提出書類 */
export const APPLICATION_DOCUMENTS = [
  { key: "application_form", label: "入学願書" },
  { key: "photo", label: "顔写真" },
  { key: "transcript", label: "成績証明書(調査書)" },
  { key: "essay", label: "作文" },
];

/** 合否通知の同封書類 */
export const DECISION_DOCUMENTS = [
  { key: "result_letter", label: "合否通知書" },
  { key: "tuition_guide", label: "学費案内" },
  { key: "school_rules", label: "入学規約" },
  { key: "supplies_list", label: "学用品一覧" },
  { key: "uniform_guide", label: "制服案内" },
  { key: "enrollment_flow", label: "入学までの流れ" },
];

/** 適性検査の特性 */
export const APTITUDE_TRAITS: Record<string, string> = {
  leader: "リーダーシップ",
  steady: "継続力(コツコツ型)",
  sensitivity: "感受性",
  stress: "ストレス耐性",
  animal: "動物適性",
  group_life: "集団適性",
  dorm: "寮適性",
  service: "接客適性",
};

export const SUITABILITY_LABELS: Record<string, string> = {
  jockey: "騎手向き",
  groom: "厩務員向き",
  ranch: "牧場スタッフ向き",
  instructor: "乗馬インストラクター向き",
};

/** フォローアップ自動抽出ルール */
export const FOLLOW_UP_RULES = [
  {
    key: "video_no_survey",
    label: "動画視聴済み・仮審査アンケート未回答",
    description: "紹介動画を見たがアンケートに回答していない見込み客",
  },
  {
    key: "survey_no_booking",
    label: "仮審査回答済み・見学予約なし",
    description: "アンケートに回答したが見学予約をしていない見込み客",
  },
  {
    key: "attended_no_application",
    label: "体験参加後14日経過・出願なし",
    description: "体験に参加してから14日以上経過したが出願していない見込み客",
  },
] as const;

/** 在校生定期アンケートのデフォルト設問 */
export const DEFAULT_STUDENT_SURVEY_QUESTIONS = [
  { id: "q1", text: "最近の学校生活はどうですか", type: "choice", options: ["とても充実している", "充実している", "普通", "少しつらい", "つらい"] },
  { id: "q2", text: "健康状態はどうですか", type: "choice", options: ["良好", "普通", "少し不調", "不調"] },
  { id: "q3", text: "寮生活で困っていることはありますか", type: "textarea" },
  { id: "q4", text: "担当馬との関係はどうですか", type: "choice", options: ["とても良い", "良い", "普通", "うまくいっていない"] },
  { id: "q5", text: "先生やスタッフに相談したいことがあれば書いてください", type: "textarea" },
];
