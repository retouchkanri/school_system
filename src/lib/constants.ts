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
  approved: "A判定",
  caution: "B判定",
  rejected: "C判定",
};

/** 入学仮審査結果として本人に表示する文言 (「不合格」等の表現は使わない) */
export const AI_JUDGEMENT_MESSAGES: Record<AiJudgement, string> = {
  approved: "馬事学院での学校生活との相性は非常に高いと考えられます。",
  caution: "安心して学校生活を送れるよう、体験入学で詳しくご案内いたします。",
  rejected: "ご不安な点について、個別相談で一緒に解決方法を考えましょう。",
};

/** 銀行振込先情報 (振込先が変わる場合はこの1箇所を差し替えてください) */
export const BANK_TRANSFER_INFO = "GMOあおぞらネット銀行 法人営業部 普通 2496071 (口座名義: リトウチ)";

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

/** 希望学科ごとの「体験入学申込」外部フォームURL */
export const EXPERIENCE_APPLICATION_URLS: Record<string, string> = {
  "東関東馬事高等学院(高等課程)": "https://bajigaku.net/taiken-1/",
  "東関東馬事専門学院(専門課程)": "https://bajigaku.site/taiken/",
};

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
  type: "text" | "textarea" | "choice" | "checkbox" | "stars";
  options?: string[];
  /** 必須項目かどうか (未指定 = 任意) */
  required?: boolean;
  /** 設問の下に表示する補足 (例: 合否に影響しない旨) */
  note?: string;
  /** この設問から新しいセクション見出しを表示する場合に設定 */
  section?: string;
};

export const PRE_SCREENING_QUESTIONS: SurveyQuestion[] = [
  {
    id: "current_status",
    section: "STEP1 現在の状況について",
    text: "現在のあなたの立場について教えてください",
    type: "choice",
    required: true,
    options: [
      "中学1年", "中学2年", "中学3年",
      "高校1年", "高校2年", "高校3年",
      "高校中退", "通信制高校", "専門学校等", "社会人", "その他",
    ],
  },
  { id: "current_status_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
  {
    id: "attendance",
    text: "現在の出席状況を教えてください",
    type: "choice",
    required: true,
    options: ["毎日通っている", "時々休む", "あまり学校にいっていない", "ほとんど学校にいっていない", "別室登校", "フリースクール", "その他"],
    note: "※この回答によって合否が決まることはありません。",
  },
  { id: "attendance_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },

  {
    id: "horse_experience_level",
    section: "STEP3 馬について",
    text: "馬に乗ったことはありますか？",
    type: "choice",
    required: true,
    options: ["初めて", "数回ある", "乗馬クラブに所属", "経験者", "学校で学んだことがある"],
    note: "※この回答によって合否が決まることはありません。",
  },
  {
    id: "horse_experience_detail",
    text: "「経験者」を選んだ方は、乗馬経験の年数・回数・技術レベルなど具体的に教えてください",
    type: "textarea",
  },
  {
    id: "horse_career_intent",
    text: "馬を仕事にしたいと思っていますか？",
    type: "choice",
    required: true,
    options: ["とても思う", "少し思う", "まだ迷っている", "趣味として考えている"],
  },
  {
    id: "future_jobs",
    text: "将来やってみたい仕事(複数選択可能)",
    type: "checkbox",
    options: [
      "騎手", "JRA厩務員", "地方競馬の厩務員", "生産牧場", "育成牧場", "乗馬クラブ",
      "引退競走馬の関連", "観光牧場", "その他動物関係全般", "まだわからない", "その他",
    ],
  },
  { id: "future_jobs_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },

  {
    id: "dorm_life",
    section: "STEP4 学校生活について",
    text: "全寮制について",
    type: "choice",
    required: true,
    options: ["問題ない", "少し不安", "とても不安"],
  },
  { id: "dorm_life_worry", text: "不安な点があれば教えてください(300文字以内)", type: "textarea" },
  {
    id: "group_life",
    text: "共同生活について",
    type: "choice",
    required: true,
    options: ["楽しみ", "少し心配", "不安"],
  },
  { id: "group_life_worry", text: "不安な点があれば教えてください(300文字以内)", type: "textarea" },
  { id: "early_riser", text: "早起き", type: "choice", required: true, options: ["得意", "普通", "苦手"] },
  { id: "animal_care", text: "動物のお世話", type: "choice", required: true, options: ["好き", "やったことがない", "不安"] },
  { id: "physical_fitness", text: "体力について", type: "choice", required: true, options: ["自信がある", "普通", "少し不安"] },

  {
    id: "concerns",
    section: "STEP5 入学を考える上で気になること",
    text: "入学を考える上で一番気になることは何ですか？(複数選択可能)",
    type: "checkbox",
    options: ["学費", "寮生活", "就職", "人間関係", "不登校への対応", "先生との距離", "安全面", "その他"],
  },
  { id: "concerns_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
  {
    id: "tuition_concern",
    text: "学費について",
    type: "choice",
    required: true,
    options: ["問題ない", "分割を相談したい", "奨学金を知りたい", "教育ローンを知りたい"],
  },
  { id: "info_session_questions", text: "学校説明会では何を聞きたいですか？(どんなことでもご記入ください)", type: "textarea" },

  { id: "future_dream", section: "STEP6 将来について", text: "今、自分が考えている将来の夢があれば書いてください", type: "textarea" },

  {
    id: "why_school",
    section: "一番重要な質問",
    text: "あなたは、なぜ馬事学院を選ぼうと思いましたか？",
    type: "textarea",
    required: true,
  },

  { id: "current_worry", section: "STEP9 その他", text: "現在、不安に思っていることがあれば何でも教えてください", type: "textarea" },
];

/** 学校見学・オープンキャンパス参加後アンケート */
export const POST_VISIT_QUESTIONS: SurveyQuestion[] = [
  { id: "satisfaction", section: "本日の感想について", text: "本日の満足度", type: "stars", required: true },
  {
    id: "impressive_points",
    text: "本日の説明で特に印象に残った内容(複数回答可)",
    type: "checkbox",
    options: [
      "引退競走馬について", "馬とのふれあい", "担当馬制度", "全寮制について", "高校卒業資格について",
      "JRA・騎手・厩務員など就職実績", "学校生活", "部活動・馬術大会", "学費について", "その他",
    ],
  },
  { id: "impressive_points_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
  { id: "visit_impression", text: "実際に学校へ来てみて、どのような印象でしたか？", type: "textarea" },
  {
    id: "horse_contact_feeling",
    text: "馬と接してみてどう感じましたか？",
    type: "checkbox",
    options: ["想像以上によかった", "楽しかった", "少し緊張した", "もっと触れ合いたかった", "その他"],
  },
  { id: "horse_contact_feeling_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
  {
    id: "life_worries",
    text: "学校生活について不安なことはありますか？",
    type: "checkbox",
    options: ["寮生活", "勉強", "馬の世話", "人間関係", "学費", "将来の進路", "特になし", "その他"],
  },
  { id: "life_worries_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
  { id: "looking_forward_to", text: "入学した場合、一番楽しみなことは何ですか？", type: "textarea" },
  { id: "enrollment_intent", section: "入学についてお伺いします", text: "現在の入学希望度", type: "stars", required: true },
  { id: "want_to_know", text: "入学を決めるために、知りたいこと・相談したいことなどありましたら、ご記入ください", type: "textarea" },
  {
    id: "tuition_installment",
    text: "学費の分割を希望したいですか？",
    type: "choice",
    options: ["特に考えていない", "24回", "48回", "60回"],
  },
  {
    id: "referral_trigger",
    text: "本校を知ったきっかけ",
    type: "checkbox",
    options: ["YouTube", "Instagram", "TikTok", "Google検索", "学校紹介", "先生", "家族", "知人", "その他"],
  },
  { id: "referral_trigger_other", text: "「その他」を選んだ方はこちらにご記入ください", type: "text" },
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
