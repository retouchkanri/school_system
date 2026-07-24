/**
 * セットアップスクリプト
 *  1. supabase/schema.sql が適用済みかチェック
 *  2. デモ用アカウント(職員・入学希望者・在校生・保護者・支援者)を作成
 *  3. サンプルデータを投入
 *
 * 使い方:  npm run setup          (既存データがあればスキップ)
 *          npm run setup -- --force  (全データを削除して再投入)
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✗ .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const FORCE = process.argv.includes("--force");

const iso = (d) => d.toISOString();
const dateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysAhead = (n) => daysAgo(-n);

async function ins(table, rows) {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`${table} への投入に失敗: ${error.message}`);
  return data;
}

async function ensureUser(email, password, fullName, role) {
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  let userId = created?.user?.id;
  if (error) {
    // 既存ユーザーを検索
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => u.email === email);
    if (!found) throw new Error(`ユーザー作成に失敗 (${email}): ${error.message}`);
    userId = found.id;
  }
  const { error: pErr } = await db.from("profiles").upsert({
    id: userId,
    role,
    full_name: fullName,
    email,
  });
  if (pErr) throw new Error(`profiles 作成に失敗 (${email}): ${pErr.message}`);
  return userId;
}

async function main() {
  console.log("🐴 東関東馬事学院システム セットアップを開始します\n");

  // 1) スキーマ適用チェック
  const { error: schemaErr } = await db.from("leads").select("id").limit(1);
  if (schemaErr) {
    console.error("✗ データベースにテーブルが見つかりません。");
    console.error("");
    console.error("  1. https://supabase.com/dashboard → 対象プロジェクト → SQL Editor を開く");
    console.error("  2. supabase/schema.sql の内容を貼り付けて Run を実行");
    console.error("  3. もう一度 npm run setup を実行");
    process.exit(1);
  }
  console.log("✓ スキーマ適用済み");

  // 2) 既存データチェック / --force で全削除
  const { count } = await db.from("leads").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    if (!FORCE) {
      console.log("✓ 既にサンプルデータが投入されています (再投入する場合: npm run setup -- --force)");
      process.exit(0);
    }
    console.log("… 既存データを削除しています (--force)");
    const tables = [
      "follow_up_logs", "notifications", "bulk_messages", "student_survey_responses", "student_surveys",
      "horse_monthly_summaries", "supporters", "meal_records", "overnight_leave_requests", "riding_reports",
      "training_records", "attendance_records", "payments", "students", "enrollment_procedures",
      "admission_decisions", "aptitude_tests", "applications", "experience_surveys", "open_campus_bookings",
      "open_campus_events", "pre_screening_surveys", "video_progress", "announcements", "leads", "horses",
    ];
    for (const t of tables) {
      const { error } = await db.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(`${t} の削除に失敗: ${error.message}`);
    }
  }

  // 3) デモユーザー
  console.log("… デモユーザーを作成しています");
  const adminId = await ensureUser("admin@bajigakuin.jp", "admin123456", "野口 佳槻", "admin");
  const staffId = await ensureUser("staff@bajigakuin.jp", "staff123456", "田中 直子(入試担当)", "admin");
  const applicantId = await ensureUser("applicant@example.com", "applicant123", "佐藤 美咲", "applicant");
  const student1Id = await ensureUser("student1@example.com", "student123", "鈴木 陸", "student");
  const student2Id = await ensureUser("student2@example.com", "student123", "高橋 結衣", "student");
  const parent1Id = await ensureUser("parent1@example.com", "parent123", "鈴木 恵子", "parent");
  const supporterId = await ensureUser("supporter1@example.com", "supporter123", "渡辺 一郎", "supporter");
  console.log("✓ デモユーザー作成完了");

  // 4) 馬
  console.log("… サンプルデータを投入しています");
  const horses = await ins("horses", [
    { name: "サクラウィンド", breed: "サラブレッド", age: 8, stall: "A-1", is_retouch: false, photo_url: "/images/horse-1.jpg", notes: "落ち着いた性格で初心者向き" },
    { name: "ハヤテマル", breed: "サラブレッド", age: 6, stall: "A-2", is_retouch: false, photo_url: "/images/horse-3.jpg", notes: "元競走馬。運動量が多い" },
    { name: "モモタロウ", breed: "ポニー", age: 12, stall: "B-1", is_retouch: false, photo_url: "/images/horse-2.jpg", notes: "体験乗馬の看板馬" },
    { name: "シルバーレイン", breed: "サラブレッド", age: 15, stall: "C-1", is_retouch: true, photo_url: "/images/horse-1.jpg", notes: "リタッチ馬。引退後は生徒のケア実習を担当" },
    { name: "ゴールドスター", breed: "サラブレッド", age: 17, stall: "C-2", is_retouch: true, photo_url: "/images/horse-2.jpg", notes: "リタッチ馬。温厚で高齢馬ケアの教材的存在" },
    { name: "コハク", breed: "道産子", age: 9, stall: "B-2", is_retouch: false, photo_url: "/images/horse-3.jpg", notes: "力持ちで馬車実習担当" },
  ]);
  const horseByName = Object.fromEntries(horses.map((h) => [h.name, h]));

  // 5) リード (様々なステージ)
  const leadRows = [
    // 新規: 資料請求のみ
    { name: "伊藤 蒼真", kana: "イトウ ソウマ", grade: "中学3年", gender: "男性", school_name: "船橋市立第三中学校", guardian_name: "伊藤 由美", email: "soma.ito@example.com", phone: "090-1111-2222", address: "千葉県船橋市本町1-1", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["騎手", "厩務員"], horse_experience: false, referral_source: "YouTube", status: "material_requested", assigned_staff: staffId, created_at: iso(daysAgo(2)) },
    // 資料発送済
    { name: "小林 芽衣", kana: "コバヤシ メイ", grade: "中学3年", gender: "女性", school_name: "千葉市立幕張中学校", guardian_name: "小林 直樹", email: "mei.k@example.com", phone: "080-2222-3333", address: "千葉県千葉市美浜区1-2", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["乗馬インストラクター"], horse_experience: true, horse_experience_detail: "乗馬クラブで半年", referral_source: "Instagram", status: "material_sent", material_sent_date: dateStr(daysAgo(5)), assigned_staff: staffId, created_at: iso(daysAgo(7)) },
    // 動画視聴済・アンケート未回答 → フォロー対象①
    { name: "加藤 大和", kana: "カトウ ヤマト", grade: "高校2年", gender: "男性", school_name: "県立東金高校", guardian_name: "加藤 幸子", email: "yamato@example.com", phone: "090-3333-4444", address: "千葉県東金市田間2-3", desired_course: "東関東馬事専門学院(専門課程)", interested_jobs: ["厩務員", "牧場スタッフ"], horse_experience: false, referral_source: "インターネット検索", status: "video_watched", material_sent_date: dateStr(daysAgo(12)), assigned_staff: staffId, created_at: iso(daysAgo(14)) },
    // 仮審査回答済・見学予約なし → フォロー対象②
    { name: "山口 さくら", kana: "ヤマグチ サクラ", grade: "中学3年", gender: "女性", school_name: "茂原市立南中学校", guardian_name: "山口 健", email: "sakura.y@example.com", phone: "080-4444-5555", address: "千葉県茂原市町保3", line_id: "sakura_line", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["騎手"], horse_experience: false, referral_source: "TikTok", status: "ai_judged", material_sent_date: dateStr(daysAgo(18)), assigned_staff: adminId, ai_type: "前向き努力タイプ", ai_summary: "将来の夢は「ジョッキーになりたい」。動物への興味が非常に強い。集団生活は概ね問題ないと思われる。朝が苦手なため、生活リズムづくりのサポートがあると良い。", ai_judgement: "approved", created_at: iso(daysAgo(20)) },
    // 見学予約済(入金待ち)
    { name: "松本 颯太", kana: "マツモト ソウタ", grade: "中学2年", gender: "男性", school_name: "成田市立中台中学校", guardian_name: "松本 里奈", email: "sota.m@example.com", phone: "070-5555-6666", address: "千葉県成田市花崎町4", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["騎手", "調教師"], horse_experience: true, horse_experience_detail: "祖父の牧場で手伝い", referral_source: "知人・紹介", status: "visit_reserved", material_sent_date: dateStr(daysAgo(25)), assigned_staff: staffId, ai_type: "動物大好きタイプ", ai_summary: "馬経験があり動物への親和性が高い。集団生活にも適応できそう。", ai_judgement: "approved", created_at: iso(daysAgo(28)) },
    // 体験参加後14日経過・出願なし → フォロー対象③
    { name: "木村 心春", kana: "キムラ コハル", grade: "中学3年", gender: "女性", school_name: "柏市立柏中学校", guardian_name: "木村 大輔", email: "koharu@example.com", phone: "090-6666-7777", address: "千葉県柏市中央1-5", line_id: "koharu_k", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["乗馬インストラクター", "獣医・動物看護"], horse_experience: false, referral_source: "イベント", status: "exp_survey_answered", material_sent_date: dateStr(daysAgo(40)), assigned_staff: adminId, ai_type: "繊細・マイペースタイプ", ai_summary: "感受性が豊かで動物への observation力が高い。人前では緊張しやすいため初期サポート推奨。", ai_judgement: "caution", ai_enrollment_probability: 74, created_at: iso(daysAgo(45)) },
    // 出願済・審査中
    { name: "斎藤 悠人", kana: "サイトウ ユウト", grade: "高校3年", gender: "男性", school_name: "県立佐倉東高校", guardian_name: "斎藤 真理", email: "yuto.s@example.com", phone: "080-7777-8888", address: "千葉県佐倉市城内町5", desired_course: "東関東馬事専門学院(専門課程)", interested_jobs: ["厩務員"], horse_experience: false, referral_source: "雑誌・新聞", status: "aptitude_done", material_sent_date: dateStr(daysAgo(50)), assigned_staff: staffId, ai_type: "コツコツ堅実タイプ", ai_summary: "地道な作業への適性が高く、厩務員志望と合致。集団生活にも適応できそう。", ai_judgement: "approved", ai_enrollment_probability: 88, created_at: iso(daysAgo(55)) },
    // 合格・入学手続き中 (アカウント連携済デモ用ではない)
    { name: "中村 陽菜", kana: "ナカムラ ヒナ", grade: "中学3年", gender: "女性", school_name: "市川市立第八中学校", guardian_name: "中村 徹", email: "hina.n@example.com", phone: "090-8888-9999", address: "千葉県市川市八幡2-6", line_id: "hina_line", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["騎手", "乗馬インストラクター"], horse_experience: true, horse_experience_detail: "乗馬経験2年", referral_source: "Instagram", status: "enrollment_procedure", material_sent_date: dateStr(daysAgo(70)), assigned_staff: adminId, ai_type: "明るく素直タイプ", ai_summary: "明るく素直な性格。動物への興味が非常に強い。集団生活にも適応できそう。", ai_judgement: "approved", ai_enrollment_probability: 92, created_at: iso(daysAgo(75)) },
    // 不合格
    { name: "吉田 拓海", kana: "ヨシダ タクミ", grade: "高校1年", gender: "男性", school_name: "県立千葉北高校", guardian_name: "吉田 京子", email: "takumi.y@example.com", phone: "070-9999-0000", address: "千葉県千葉市稲毛区6", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["騎手"], horse_experience: false, referral_source: "テレビ", status: "decision_sent", material_sent_date: dateStr(daysAgo(80)), assigned_staff: staffId, ai_type: "じっくりサポートタイプ", ai_summary: "保護者が反対しているため、保護者への丁寧な説明が必須。健康面で配慮が必要な点がある。", ai_judgement: "caution", ai_enrollment_probability: 35, created_at: iso(daysAgo(85)) },
    // デモ用: ログインできる入学希望者 (体験参加済→これから出願)
    { name: "佐藤 美咲", kana: "サトウ ミサキ", grade: "中学3年", gender: "女性", school_name: "東金市立東中学校", guardian_name: "佐藤 亮", email: "applicant@example.com", phone: "090-1234-5678", address: "千葉県東金市東岩崎7", line_id: "misaki_s", desired_course: "東関東馬事高等学院(高等課程)", interested_jobs: ["乗馬インストラクター", "牧場スタッフ"], horse_experience: false, referral_source: "インターネット検索", status: "exp_survey_answered", material_sent_date: dateStr(daysAgo(30)), assigned_staff: staffId, user_id: applicantId, ai_type: "明るく素直タイプ", ai_summary: "将来の夢は「馬と関わる仕事に就きたい」。動物への興味が非常に強い。集団生活にも適応できそう。人前では緊張しやすいため初期サポート推奨。", ai_judgement: "approved", ai_enrollment_probability: 86, created_at: iso(daysAgo(33)) },
  ];
  const leads = await ins("leads", leadRows);
  const leadByName = Object.fromEntries(leads.map((l) => [l.name, l]));
  const misaki = leadByName["佐藤 美咲"];

  // 6) 動画視聴
  await ins("video_progress", [
    { lead_id: leadByName["加藤 大和"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["山口 さくら"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["松本 颯太"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["木村 心春"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["斎藤 悠人"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["中村 陽菜"].id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["吉田 拓海"].id, status: "in_progress", progress_percent: 60 },
    { lead_id: misaki.id, status: "completed", progress_percent: 100 },
    { lead_id: leadByName["小林 芽衣"].id, status: "unwatched", progress_percent: 0 },
  ]);

  // 7) 仮審査アンケート
  const surveyAnswers = {
    q1: "小さい頃から馬が大好きで、馬と関わる仕事に就きたいからです。",
    q2: "馬と関わる仕事に就きたい",
    q3: "とても好き",
    q4: "できる",
    q5: "少し不安",
    q6: "普通",
    q7: "賛成している",
    q8: "ない",
    q9: "寮生活が初めてなので少し心配です",
    q10: "良好",
    q11: "なし",
    q12: "特になし",
    q13: "動物の動画を見ること、絵を描くこと",
    q14: "絵を描くこと",
    q15: "人前で話すこと",
    q16: "馬の世話を毎日頑張りたい",
  };
  await ins("pre_screening_surveys", [
    { lead_id: leadByName["山口 さくら"].id, answers: { ...surveyAnswers, q1: "ジョッキーになりたいからです。", q2: "ジョッキーになりたい", q6: "苦手" }, submitted_at: iso(daysAgo(17)) },
    { lead_id: leadByName["松本 颯太"].id, answers: { ...surveyAnswers, q1: "祖父の牧場を継ぎたい。", q2: "牧場経営", q5: "問題ない" }, submitted_at: iso(daysAgo(24)) },
    { lead_id: leadByName["木村 心春"].id, answers: { ...surveyAnswers, q1: "動物の看護に興味があります。", q2: "獣医助手" }, submitted_at: iso(daysAgo(38)) },
    { lead_id: leadByName["斎藤 悠人"].id, answers: { ...surveyAnswers, q1: "厩務員になって競走馬を支えたい。", q2: "厩務員", q5: "問題ない" }, submitted_at: iso(daysAgo(48)) },
    { lead_id: leadByName["中村 陽菜"].id, answers: { ...surveyAnswers, q1: "騎手を目指しています。", q2: "騎手", q5: "問題ない" }, submitted_at: iso(daysAgo(68)) },
    { lead_id: leadByName["吉田 拓海"].id, answers: { ...surveyAnswers, q7: "反対している", q10: "配慮が必要な点がある", q9: "体力に自信がない" }, submitted_at: iso(daysAgo(78)) },
    { lead_id: misaki.id, answers: surveyAnswers, submitted_at: iso(daysAgo(28)) },
  ]);

  // 8) オープンキャンパス
  const events = await ins("open_campus_events", [
    { title: "オープンキャンパス(乗馬体験つき)", event_date: dateStr(daysAgo(20)), start_time: "10:00", capacity: 20, fee: 8000, description: "乗馬体験・厩舎見学・寮見学・保護者説明会" },
    { title: "夏のオープンキャンパス", event_date: dateStr(daysAhead(10)), start_time: "10:00", capacity: 20, fee: 8000, description: "乗馬体験・在校生との交流ランチつき" },
    { title: "個別学校見学会", event_date: dateStr(daysAhead(24)), start_time: "13:30", capacity: 10, fee: 8000, description: "少人数制の見学会。個別相談が可能です" },
  ]);
  const pastEvent = events[0];
  const nextEvent = events[1];

  // 9) 見学予約
  await ins("open_campus_bookings", [
    { lead_id: leadByName["松本 颯太"].id, event_id: nextEvent.id, status: "reserved", payment_method: "bank_transfer", payment_status: "pending" },
    { lead_id: leadByName["木村 心春"].id, event_id: pastEvent.id, status: "attended", payment_method: "credit_card", payment_status: "confirmed" },
    { lead_id: leadByName["斎藤 悠人"].id, event_id: pastEvent.id, status: "attended", payment_method: "bank_transfer", payment_status: "confirmed" },
    { lead_id: leadByName["中村 陽菜"].id, event_id: pastEvent.id, status: "attended", payment_method: "credit_card", payment_status: "confirmed" },
    { lead_id: misaki.id, event_id: pastEvent.id, status: "attended", payment_method: "credit_card", payment_status: "confirmed" },
  ]);

  // 10) 体験アンケート
  const expStudent = { s1: "とても楽しかった", s2: "とても好きになった", s3: "できそう", s4: "ぜひ入学したい", s5: "馬に乗れて最高でした。先輩たちも優しかったです。" };
  const expParent = { p1: "とても安心できた", p2: "とても共感できた", p3: "とても良かった", p4: "少しある", p5: "寮の設備が想像以上に整っていて安心しました。" };
  await ins("experience_surveys", [
    { lead_id: misaki.id, respondent: "student", answers: expStudent, submitted_at: iso(daysAgo(19)) },
    { lead_id: misaki.id, respondent: "parent", answers: expParent, submitted_at: iso(daysAgo(19)) },
    { lead_id: leadByName["木村 心春"].id, respondent: "student", answers: { ...expStudent, s4: "迷っている" }, submitted_at: iso(daysAgo(18)) },
    { lead_id: leadByName["中村 陽菜"].id, respondent: "student", answers: expStudent, submitted_at: iso(daysAgo(19)) },
    { lead_id: leadByName["中村 陽菜"].id, respondent: "parent", answers: { ...expParent, p4: "特にない" }, submitted_at: iso(daysAgo(19)) },
    { lead_id: leadByName["斎藤 悠人"].id, respondent: "student", answers: { ...expStudent, s1: "楽しかった" }, submitted_at: iso(daysAgo(18)) },
  ]);

  // 11) 出願・適性検査
  await ins("applications", [
    { lead_id: leadByName["斎藤 悠人"].id, documents: { application_form: true, photo: true, transcript: true, essay: true }, essay: "私は競走馬を陰で支える厩務員になりたいと考えています。…", status: "under_review", submitted_at: iso(daysAgo(15)) },
    { lead_id: leadByName["中村 陽菜"].id, documents: { application_form: true, photo: true, transcript: true, essay: true }, essay: "騎手になる夢を叶えるため、貴学院で学びたいです。…", status: "decided", interview_date: dateStr(daysAgo(30)), submitted_at: iso(daysAgo(40)) },
    { lead_id: leadByName["吉田 拓海"].id, documents: { application_form: true, photo: true, transcript: false, essay: true }, essay: "騎手志望です。", status: "decided", interview_date: dateStr(daysAgo(35)), submitted_at: iso(daysAgo(45)) },
  ]);

  const aptScores = { leader: 62, steady: 78, sensitivity: 70, stress: 65, animal: 92, group_life: 74, dorm: 68, service: 60 };
  await ins("aptitude_tests", [
    { lead_id: leadByName["斎藤 悠人"].id, answers: { q1: 4 }, scores: { ...aptScores, steady: 88, animal: 85 }, suitability: { jockey: 66, groom: 84, ranch: 78, instructor: 62 }, ai_report: "総合判定: コツコツタイプ。特に「継続力」(88点)と「動物適性」(85点)が高く、大きな強みです。職業適性では「厩務員向き」が84点で最も高い結果となりました。全体的にバランスが良く、大きな懸念点は見られません。", completed_at: iso(daysAgo(12)) },
    { lead_id: leadByName["中村 陽菜"].id, answers: { q1: 5 }, scores: { ...aptScores, leader: 80, stress: 82 }, suitability: { jockey: 85, groom: 74, ranch: 72, instructor: 78 }, ai_report: "総合判定: リーダータイプ。特に「動物適性」(92点)と「ストレス耐性」(82点)が高く、大きな強みです。職業適性では「騎手向き」が85点で最も高い結果となりました。全体的にバランスが良く、大きな懸念点は見られません。", completed_at: iso(daysAgo(38)) },
  ]);

  // 12) 合否
  await ins("admission_decisions", [
    { lead_id: leadByName["中村 陽菜"].id, result: "accepted", notified_via: ["email", "line", "postal"], documents_sent: { result_letter: true, tuition_guide: true, school_rules: true, supplies_list: true, uniform_guide: true, enrollment_flow: true }, notified_at: iso(daysAgo(25)) },
    { lead_id: leadByName["吉田 拓海"].id, result: "rejected", notified_via: ["email", "postal"], documents_sent: { result_letter: true }, notified_at: iso(daysAgo(28)) },
  ]);

  // 13) 入学手続き
  await ins("enrollment_procedures", [
    { lead_id: leadByName["中村 陽菜"].id, photo_submitted: true, insurance_card_submitted: true, my_number_submitted: false, uniform_size: "M", boots_size: "24.5", helmet_size: "M (56-58cm)", drivers_license: false, emergency_contacts: [{ name: "中村 徹", relation: "父", phone: "090-8888-9999" }], guarantor: { name: "中村 徹", relation: "父", phone: "090-8888-9999", address: "千葉県市川市八幡2-6" }, allergies: "なし", medications: "なし", medical_conditions: "なし", agreement_accepted: true, signature: "中村陽菜", signed_at: iso(daysAgo(10)), status: "in_progress" },
  ]);

  // 14) 決済
  await ins("payments", [
    { lead_id: leadByName["木村 心春"].id, type: "open_campus", amount: 8000, method: "credit_card", status: "confirmed", paid_at: iso(daysAgo(22)), confirmed_by: staffId },
    { lead_id: leadByName["斎藤 悠人"].id, type: "open_campus", amount: 8000, method: "bank_transfer", status: "confirmed", paid_at: iso(daysAgo(21)), confirmed_by: staffId },
    { lead_id: leadByName["中村 陽菜"].id, type: "open_campus", amount: 8000, method: "credit_card", status: "confirmed", paid_at: iso(daysAgo(22)), confirmed_by: staffId },
    { lead_id: misaki.id, type: "open_campus", amount: 8000, method: "credit_card", status: "confirmed", paid_at: iso(daysAgo(21)), confirmed_by: staffId },
    { lead_id: leadByName["松本 颯太"].id, type: "open_campus", amount: 8000, method: "bank_transfer", status: "pending" },
    { lead_id: leadByName["中村 陽菜"].id, type: "admission_fee", amount: 300000, method: "bank_transfer", status: "paid", paid_at: iso(daysAgo(8)) },
    { lead_id: leadByName["中村 陽菜"].id, type: "uniform", amount: 85000, method: "bank_transfer", status: "pending" },
    { lead_id: leadByName["中村 陽菜"].id, type: "materials", amount: 42000, method: "bank_transfer", status: "pending" },
  ]);

  // 15) 在校生
  const students = await ins("students", [
    { user_id: student1Id, parent_user_id: parent1Id, student_number: "H24-001", name: "鈴木 陸", kana: "スズキ リク", class_name: "高等課程2年A組", dorm_room: "男子寮 203", assigned_horse_id: horseByName["ハヤテマル"].id, stall_number: "A-2", enrollment_date: dateStr(daysAgo(470)), status: "enrolled" },
    { user_id: student2Id, parent_user_id: null, student_number: "H25-004", name: "高橋 結衣", kana: "タカハシ ユイ", class_name: "高等課程1年A組", dorm_room: "女子寮 105", assigned_horse_id: horseByName["サクラウィンド"].id, stall_number: "A-1", enrollment_date: dateStr(daysAgo(105)), status: "enrolled" },
    { user_id: null, parent_user_id: null, student_number: "S25-002", name: "山田 健太", kana: "ヤマダ ケンタ", class_name: "専門課程1年", dorm_room: "男子寮 110", assigned_horse_id: horseByName["シルバーレイン"].id, stall_number: "C-1", enrollment_date: dateStr(daysAgo(105)), status: "enrolled" },
  ]);
  const [riku, yui, kenta] = students;

  // 16) 出欠 (直近14日、日曜除く)
  const attendanceRows = [];
  for (let i = 1; i <= 14; i++) {
    const d = daysAgo(i);
    if (d.getDay() === 0) continue;
    for (const s of students) {
      let status = "present";
      let note = null;
      if (s.id === yui.id && i === 3) { status = "late"; note = "通院のため1時間遅刻"; }
      if (s.id === kenta.id && i === 6) { status = "absent"; note = "発熱のため欠席"; }
      if (s.id === riku.id && i === 9) { status = "early_leave"; note = "家庭の事情により早退"; }
      attendanceRows.push({ student_id: s.id, date: dateStr(d), status, note, recorded_by: adminId });
    }
  }
  await ins("attendance_records", attendanceRows);

  // 17) 食事 (直近5日)
  const mealRows = [];
  for (let i = 1; i <= 5; i++) {
    const d = dateStr(daysAgo(i));
    for (const s of students) {
      for (const meal of ["breakfast", "lunch", "dinner"]) {
        let eaten = true;
        let note = null;
        if (s.id === yui.id && meal === "breakfast" && i % 2 === 1) { eaten = false; note = "食欲なし"; }
        mealRows.push({ student_id: s.id, date: d, meal, eaten, note });
      }
    }
  }
  await ins("meal_records", mealRows);

  // 18) 騎乗報告 (今月・先月、リタッチ馬含む)
  const ridingRows = [];
  const ridingTemplates = [
    { content: "常歩・速歩の基本練習。姿勢の安定を重点的に指導。", condition: "落ち着いており状態良好" },
    { content: "駈歩の発進練習。合図のタイミングが改善してきた。", condition: "やや汗が多め、飲水量は正常" },
    { content: "障害の低いバーでの練習。馬の集中力が高かった。", condition: "食欲旺盛で毛づやも良い" },
    { content: "外乗(場外騎乗)訓練。周囲の音にも動じず落ち着いていた。", condition: "蹄の状態を装蹄師に確認依頼" },
    { content: "馬房清掃と手入れ実習。ブラッシングで信頼関係づくり。", condition: "リラックスしている様子" },
  ];
  for (let i = 0; i < 18; i++) {
    const daysBack = 2 + i * 3;
    const t = ridingTemplates[i % ridingTemplates.length];
    const student = students[i % students.length];
    const horse = i % 3 === 0 ? horseByName["シルバーレイン"] : i % 3 === 1 ? horseByName["ゴールドスター"] : (student.assigned_horse_id === horseByName["ハヤテマル"].id ? horseByName["ハヤテマル"] : horseByName["サクラウィンド"]);
    ridingRows.push({
      student_id: student.id,
      horse_id: horse.id,
      report_date: dateStr(daysAgo(daysBack)),
      lesson: `${(i % 4) + 1}時限 騎乗実習`,
      content: t.content,
      horse_condition: t.condition,
      reported_by: adminId,
    });
  }
  await ins("riding_reports", ridingRows);

  // 19) 研修
  await ins("training_records", [
    { student_id: riku.id, title: "JRA競馬学校見学研修", category: "校外研修", date: dateStr(daysAgo(30)), result: "修了", instructor: "野口 佳槻", notes: "騎手課程の説明を熱心に聞いていた" },
    { student_id: riku.id, title: "装蹄基礎講習", category: "資格・講習", date: dateStr(daysAgo(12)), result: "修了", instructor: "外部講師 佐々木", notes: null },
    { student_id: yui.id, title: "乗馬ライセンス5級 取得試験", category: "資格・講習", date: dateStr(daysAgo(20)), result: "合格", instructor: "田中 直子", notes: "実技・筆記ともに良好" },
    { student_id: kenta.id, title: "牧場実習(1週間)", category: "校外研修", date: dateStr(daysAgo(45)), result: "修了", instructor: "研修先: 青葉ファーム", notes: "朝の飼付から夜間見回りまで一通り経験" },
  ]);

  // 20) 外泊届
  await ins("overnight_leave_requests", [
    { student_id: riku.id, start_date: dateStr(daysAhead(5)), end_date: dateStr(daysAhead(7)), destination: "実家(千葉県柏市)", reason: "祖母の法事のため", parent_approval: "pending", staff_acknowledged: false },
    { student_id: riku.id, start_date: dateStr(daysAgo(40)), end_date: dateStr(daysAgo(38)), destination: "実家(千葉県柏市)", reason: "夏季帰省", parent_approval: "approved", parent_comment: "よろしくお願いします。", approved_at: iso(daysAgo(45)), staff_acknowledged: true },
    { student_id: yui.id, start_date: dateStr(daysAhead(12)), end_date: dateStr(daysAhead(13)), destination: "実家(東京都江戸川区)", reason: "家族旅行", parent_approval: "approved", parent_comment: "承認します。", approved_at: iso(daysAgo(1)), staff_acknowledged: false },
  ]);

  // 21) 定期アンケート
  const svy = await ins("student_surveys", [
    {
      title: "生活状況アンケート(7月)",
      description: "毎月の学校生活・寮生活の状況確認アンケートです。",
      target: "students",
      questions: [
        { id: "q1", text: "最近の学校生活はどうですか", type: "choice", options: ["とても充実している", "充実している", "普通", "少しつらい", "つらい"] },
        { id: "q2", text: "健康状態はどうですか", type: "choice", options: ["良好", "普通", "少し不調", "不調"] },
        { id: "q3", text: "寮生活で困っていることはありますか", type: "textarea" },
        { id: "q4", text: "担当馬との関係はどうですか", type: "choice", options: ["とても良い", "良い", "普通", "うまくいっていない"] },
        { id: "q5", text: "先生やスタッフに相談したいことがあれば書いてください", type: "textarea" },
      ],
      active: true,
    },
  ]);
  await ins("student_survey_responses", [
    { survey_id: svy[0].id, student_id: yui.id, answers: { q1: "充実している", q2: "良好", q3: "特にありません", q4: "とても良い", q5: "" }, submitted_at: iso(daysAgo(3)) },
  ]);

  // 22) リタッチ馬 月次要約
  const lastMonth = daysAgo(30);
  await ins("horse_monthly_summaries", [
    {
      horse_id: horseByName["シルバーレイン"].id,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
      summary: `${lastMonth.getMonth() + 1}月のシルバーレイン号のご報告です。今月は6回の騎乗・活動記録がありました。山田健太さんをはじめとする生徒たちが日々の手入れと騎乗を担当し、信頼関係を深めています。健康状態は良好で、食欲旺盛、毛づやも良い状態を保っています。支援者の皆さまの温かいご支援に、生徒・スタッフ一同心より感謝申し上げます。`,
      report_count: 6,
      shared: true,
    },
    {
      horse_id: horseByName["ゴールドスター"].id,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
      summary: `${lastMonth.getMonth() + 1}月のゴールドスター号のご報告です。今月は5回の活動記録がありました。高齢馬ながら穏やかに過ごしており、生徒たちのケア実習(ブラッシング・蹄のお手入れ)を通じて活躍しています。装蹄師による定期チェックも問題ありませんでした。引き続き温かく見守りいただけますと幸いです。`,
      report_count: 5,
      shared: true,
    },
  ]);

  // 23) 一口支援者
  await ins("supporters", [
    { user_id: supporterId, horse_id: horseByName["シルバーレイン"].id, name: "渡辺 一郎", since: dateStr(daysAgo(400)) },
    { user_id: null, horse_id: horseByName["ゴールドスター"].id, name: "株式会社サラブレッド商事", since: dateStr(daysAgo(300)) },
  ]);

  // 24) お知らせ
  await ins("announcements", [
    { audience: "enrollee", title: "入学式のご案内", body: "入学式は4月8日(水)10時より本校馬場にて挙行します。持ち物: 入学通知書、筆記用具、印鑑。制服は入学式当日に着用してください。", send_email: true, send_line: true, created_by: adminId, published_at: iso(daysAgo(15)) },
    { audience: "enrollee", title: "寮の入寮案内と配属馬房の発表", body: "入寮日は4月6日(月)です。配属馬房・担当馬・クラスはマイページで確認できます。制服の発送は3月下旬を予定しています。", send_email: true, send_line: true, created_by: adminId, published_at: iso(daysAgo(10)) },
    { audience: "student", title: "夏季集中騎乗訓練のお知らせ", body: "8月1日〜7日に夏季集中騎乗訓練を実施します。参加者は前日までに担当馬の装具点検を済ませてください。", send_email: true, send_line: true, created_by: adminId, published_at: iso(daysAgo(5)) },
    { audience: "parent", title: "保護者面談週間のご案内", body: "7月22日〜26日に保護者面談を実施します。ご希望の日時を担任までご連絡ください。オンライン面談も可能です。", send_email: true, send_line: false, created_by: adminId, published_at: iso(daysAgo(4)) },
    { audience: "supporter", title: "リタッチ馬 夏の見学会", body: "支援馬とふれあえる夏の見学会を8月10日に開催します。ご参加をお待ちしております。", send_email: true, send_line: false, created_by: adminId, published_at: iso(daysAgo(2)) },
  ]);

  // 25) 一斉送信ログ
  await ins("bulk_messages", [
    { audience: "both", title: "台風接近に伴う日程変更のお知らせ", body: "台風接近のため、明日の校外研修は延期します。通常授業を行います。", via_email: true, via_line: true, recipient_count: 5, sent_by: adminId, sent_at: iso(daysAgo(8)) },
  ]);

  // 26) 送信ログ
  await ins("notifications", [
    { channel: "email", recipient: "applicant@example.com", title: "【東関東馬事学院】資料請求ありがとうございます", body: "パンフレットを発送いたします。", related_type: "material_request", sent_at: iso(daysAgo(33)) },
    { channel: "line", recipient: "misaki_s", title: "学院紹介動画のご案内", body: "紹介動画をご覧ください🐴", related_type: "video_invite", sent_at: iso(daysAgo(31)) },
    { channel: "email", recipient: "hina.n@example.com", title: "【重要】合否通知のお知らせ", body: "マイページにて合否をご確認ください。", related_type: "decision", sent_at: iso(daysAgo(25)) },
    { channel: "line", recipient: "hina_line", title: "合格おめでとうございます🌸", body: "入学手続きのご案内をお送りしました。", related_type: "decision", sent_at: iso(daysAgo(25)) },
  ]);

  console.log("✓ サンプルデータ投入完了\n");
  console.log("========================================");
  console.log("セットアップ完了! npm run dev で起動できます");
  console.log("----------------------------------------");
  console.log("管理者    : admin@bajigakuin.jp / admin123456");
  console.log("職員      : staff@bajigakuin.jp / staff123456");
  console.log("入学希望者: applicant@example.com / applicant123");
  console.log("在校生    : student1@example.com / student123");
  console.log("在校生2   : student2@example.com / student123");
  console.log("保護者    : parent1@example.com / parent123");
  console.log("一口支援者: supporter1@example.com / supporter123");
  console.log("========================================");
}

main().catch((e) => {
  console.error("✗ セットアップ失敗:", e.message);
  process.exit(1);
});
