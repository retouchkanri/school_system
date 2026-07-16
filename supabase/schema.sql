-- ============================================================
-- 東関東馬事高等学院・東関東馬事専門学院 統合管理システム
-- データベーススキーマ (Supabase SQL Editor に貼り付けて実行)
-- ============================================================

-- ---------- ENUMS ----------
create type user_role as enum ('admin','applicant','student','parent','supporter');

create type lead_status as enum (
  'material_requested',  -- 資料請求
  'material_sent',       -- 資料発送
  'video_watched',       -- 動画視聴
  'survey_answered',     -- 仮審査回答
  'ai_judged',           -- AI判定
  'visit_reserved',      -- 見学予約
  'payment_confirmed',   -- 入金確認
  'visit_attended',      -- 体験参加
  'exp_survey_answered', -- 体験アンケート
  'applied',             -- 出願
  'aptitude_done',       -- 性格診断
  'interview',           -- 面接
  'decision_sent',       -- 合否通知
  'enrollment_procedure',-- 入学手続き
  'admission_fee_paid',  -- 入学金確認
  'uniform_ordered',     -- 制服注文
  'dorm_ready',          -- 入寮準備
  'enrolled'             -- 入学式(入学確定)
);

create type video_status as enum ('unwatched','in_progress','completed');
create type ai_judgement as enum ('approved','caution','rejected');
create type booking_status as enum ('reserved','attended','cancelled','no_show');
create type payment_method as enum ('credit_card','bank_transfer');
create type payment_status as enum ('pending','paid','confirmed','refunded');
create type payment_type as enum ('open_campus','admission_fee','uniform','materials');
create type respondent_type as enum ('student','parent');
create type application_status as enum ('draft','submitted','under_review','interview_scheduled','decided');
create type admission_result as enum ('accepted','rejected','waitlist');
create type procedure_status as enum ('not_started','in_progress','completed');
create type audience_type as enum ('enrollee','student','parent','supporter','all');
create type attendance_status as enum ('present','absent','late','early_leave');
create type meal_type as enum ('breakfast','lunch','dinner');
create type approval_status as enum ('pending','approved','rejected');
create type student_state as enum ('enrolled','graduated','withdrawn');
create type notify_channel as enum ('email','line');

-- ---------- PROFILES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'applicant',
  full_name text not null,
  email text,
  phone text,
  line_id text,
  created_at timestamptz not null default now()
);

-- ---------- 馬 ----------
create table horses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  breed text,
  age int,
  stall text,               -- 馬房
  is_retouch boolean not null default false, -- リタッチ馬(一口支援対象)
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- ステップ1: 資料請求 (リード) ----------
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kana text,
  grade text,                -- 学年
  birth_date date,
  gender text,
  school_name text,
  guardian_name text,        -- 保護者氏名
  postal_code text,
  address text,
  phone text,
  email text,
  line_id text,
  desired_course text,       -- 希望学科
  interested_jobs text[],    -- 興味のある仕事
  horse_experience boolean default false,
  horse_experience_detail text,
  referral_source text,      -- 何を見て知ったか
  status lead_status not null default 'material_requested',
  material_sent_date date,   -- 資料送付日
  assigned_staff uuid references profiles(id),
  user_id uuid references profiles(id), -- マイページアカウント連携
  ai_type text,              -- AI判定タイプ (例: 明るく素直タイプ)
  ai_summary text,           -- AI要約
  ai_judgement ai_judgement, -- ○参加可能 等
  ai_enrollment_probability int, -- 入学確率(%)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ステップ2: 動画視聴 ----------
create table video_progress (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  video_title text not null default '学院紹介動画',
  status video_status not null default 'unwatched',
  progress_percent int not null default 0,
  updated_at timestamptz not null default now(),
  unique (lead_id, video_title)
);

-- ---------- ステップ2: 入学仮審査アンケート ----------
create table pre_screening_surveys (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade unique,
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

-- ---------- ステップ3: 学校見学・オープンキャンパス ----------
create table open_campus_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time text,
  capacity int not null default 20,
  fee int not null default 8000,
  description text,
  created_at timestamptz not null default now()
);

create table open_campus_bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  event_id uuid not null references open_campus_events(id) on delete cascade,
  status booking_status not null default 'reserved',
  payment_method payment_method,
  payment_status payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (lead_id, event_id)
);

-- ---------- ステップ4: 体験終了アンケート ----------
create table experience_surveys (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  respondent respondent_type not null,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (lead_id, respondent)
);

-- ---------- ステップ5: 出願 ----------
create table applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade unique,
  documents jsonb not null default '{}'::jsonb, -- 願書/写真/成績/作文 提出チェック
  essay text,                                   -- 作文
  status application_status not null default 'draft',
  interview_date date,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- ステップ5: 性格・適性検査 ----------
create table aptitude_tests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade unique,
  answers jsonb not null,      -- {q1: 1-5, ...}
  scores jsonb,                -- 特性スコア {leader, steady, sensitivity, stress, animal, group_life, dorm, service}
  suitability jsonb,           -- 適性 {jockey, groom, ranch, instructor}
  ai_report text,              -- AIレポート
  completed_at timestamptz not null default now()
);

-- ---------- ステップ6: 合否通知 ----------
create table admission_decisions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade unique,
  result admission_result not null,
  notified_via text[] not null default '{}', -- email / line / postal
  documents_sent jsonb not null default '{}'::jsonb, -- 合否通知/学費/入学規約/学用品一覧/制服案内/入学までの流れ
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- ステップ7: 入学手続き ----------
create table enrollment_procedures (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade unique,
  photo_submitted boolean not null default false,      -- 顔写真
  insurance_card_submitted boolean not null default false, -- 保険証
  my_number_submitted boolean not null default false,  -- マイナンバー
  uniform_size text,     -- 制服サイズ
  boots_size text,       -- ブーツサイズ
  helmet_size text,      -- ヘルメットサイズ
  drivers_license boolean not null default false,
  emergency_contacts jsonb not null default '[]'::jsonb,
  guarantor jsonb not null default '{}'::jsonb,        -- 保証人
  allergies text,
  medications text,      -- 常備薬
  medical_conditions text, -- 持病
  agreement_accepted boolean not null default false,   -- 規約同意
  signature text,        -- 電子署名
  signed_at timestamptz,
  status procedure_status not null default 'not_started',
  updated_at timestamptz not null default now()
);

-- ---------- 決済 ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  student_id uuid,
  type payment_type not null,
  amount int not null,
  method payment_method,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  confirmed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- ステップ8/在校生: 一斉配信 ----------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  audience audience_type not null,
  title text not null,
  body text not null,
  send_email boolean not null default true,
  send_line boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ---------- 在校生 ----------
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  parent_user_id uuid references profiles(id),
  lead_id uuid references leads(id),
  student_number text not null unique,
  name text not null,
  kana text,
  class_name text,           -- クラス
  dorm_room text,            -- 寮部屋
  assigned_horse_id uuid references horses(id), -- 担当馬
  stall_number text,         -- 配属馬房
  enrollment_date date,
  status student_state not null default 'enrolled',
  created_at timestamptz not null default now()
);

alter table payments add constraint payments_student_fk
  foreign key (student_id) references students(id) on delete cascade;

-- 1. 日常の出欠管理 / 5. 欠席・遅刻・早退
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  status attendance_status not null default 'present',
  note text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- 2. 研修管理
create table training_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  category text,             -- 校外研修/資格/実習 等
  date date not null,
  result text,
  instructor text,
  notes text,
  created_at timestamptz not null default now()
);

-- 3. 授業日報(騎乗報告)
create table riding_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  horse_id uuid not null references horses(id),
  report_date date not null,
  lesson text,               -- 時限・授業名
  content text not null,     -- 騎乗内容
  horse_condition text,      -- 馬の状態
  reported_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 4. 外泊届け(保護者承認)
create table overnight_leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  destination text not null,
  reason text,
  parent_approval approval_status not null default 'pending',
  parent_comment text,
  approved_at timestamptz,
  staff_acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

-- 6. 食事管理
create table meal_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  meal meal_type not null,
  eaten boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, date, meal)
);

-- 7/8. 一斉メール・LINE
create table bulk_messages (
  id uuid primary key default gen_random_uuid(),
  audience text not null,    -- students / parents / both
  title text not null,
  body text not null,
  via_email boolean not null default true,
  via_line boolean not null default true,
  recipient_count int not null default 0,
  sent_by uuid references profiles(id),
  sent_at timestamptz not null default now()
);

-- 送信ログ (メール/LINE シミュレーション)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  channel notify_channel not null,
  recipient text not null,
  title text not null,
  body text,
  related_type text,         -- lead_followup / announcement / bulk / decision 等
  sent_at timestamptz not null default now()
);

-- 定期アンケート (在校生・保護者)
create table student_surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  target text not null default 'students', -- students / parents
  questions jsonb not null,   -- [{id, text, type}]
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table student_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references student_surveys(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (survey_id, student_id)
);

-- リタッチ馬 月次AI要約 (一口支援者と共有)
create table horse_monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  horse_id uuid not null references horses(id) on delete cascade,
  year int not null,
  month int not null,
  summary text not null,
  report_count int not null default 0,
  shared boolean not null default false,  -- 支援者へ公開
  created_at timestamptz not null default now(),
  unique (horse_id, year, month)
);

-- 一口支援者
create table supporters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  horse_id uuid not null references horses(id) on delete cascade,
  name text not null,
  since date,
  created_at timestamptz not null default now()
);

-- フォローアップ送信ログ
create table follow_up_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  rule text not null,
  channel notify_channel not null,
  sent_at timestamptz not null default now()
);

-- ---------- ヘルパー関数 ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_lead_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from leads where user_id = auth.uid();
$$;

create or replace function public.my_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from students where user_id = auth.uid() or parent_user_id = auth.uid();
$$;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table horses enable row level security;
alter table leads enable row level security;
alter table video_progress enable row level security;
alter table pre_screening_surveys enable row level security;
alter table open_campus_events enable row level security;
alter table open_campus_bookings enable row level security;
alter table experience_surveys enable row level security;
alter table applications enable row level security;
alter table aptitude_tests enable row level security;
alter table admission_decisions enable row level security;
alter table enrollment_procedures enable row level security;
alter table payments enable row level security;
alter table announcements enable row level security;
alter table students enable row level security;
alter table attendance_records enable row level security;
alter table training_records enable row level security;
alter table riding_reports enable row level security;
alter table overnight_leave_requests enable row level security;
alter table meal_records enable row level security;
alter table bulk_messages enable row level security;
alter table notifications enable row level security;
alter table student_surveys enable row level security;
alter table student_survey_responses enable row level security;
alter table horse_monthly_summaries enable row level security;
alter table supporters enable row level security;
alter table follow_up_logs enable row level security;

-- profiles
create policy "profiles_own_read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_own_update" on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles_admin_all" on profiles for all using (is_admin());

-- 資料請求フォームは未ログインでも送信可
create policy "leads_public_insert" on leads for insert with check (true);
create policy "leads_own_read" on leads for select using (user_id = auth.uid() or is_admin());
create policy "leads_own_update" on leads for update using (user_id = auth.uid() or is_admin());
create policy "leads_admin_delete" on leads for delete using (is_admin());

-- リード配下テーブル(本人 or 管理者)
create policy "vp_rw" on video_progress for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "pss_rw" on pre_screening_surveys for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "ocb_rw" on open_campus_bookings for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "exs_rw" on experience_surveys for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "app_rw" on applications for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "apt_rw" on aptitude_tests for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "adm_read" on admission_decisions for select
  using (lead_id in (select my_lead_ids()) or is_admin());
create policy "adm_admin" on admission_decisions for all using (is_admin());
create policy "enp_rw" on enrollment_procedures for all
  using (lead_id in (select my_lead_ids()) or is_admin())
  with check (lead_id in (select my_lead_ids()) or is_admin());
create policy "pay_read" on payments for select
  using (lead_id in (select my_lead_ids()) or student_id in (select my_student_ids()) or is_admin());
create policy "pay_admin" on payments for all using (is_admin());
create policy "ful_admin" on follow_up_logs for all using (is_admin());

-- イベント・お知らせは閲覧可
create policy "oce_read" on open_campus_events for select using (true);
create policy "oce_admin" on open_campus_events for all using (is_admin());
create policy "ann_read" on announcements for select using (auth.uid() is not null);
create policy "ann_admin" on announcements for all using (is_admin());
create policy "horses_read" on horses for select using (auth.uid() is not null);
create policy "horses_admin" on horses for all using (is_admin());

-- 在校生関連
create policy "stu_read" on students for select
  using (user_id = auth.uid() or parent_user_id = auth.uid() or is_admin());
create policy "stu_admin" on students for all using (is_admin());
create policy "att_read" on attendance_records for select
  using (student_id in (select my_student_ids()) or is_admin());
create policy "att_admin" on attendance_records for all using (is_admin());
create policy "trn_read" on training_records for select
  using (student_id in (select my_student_ids()) or is_admin());
create policy "trn_admin" on training_records for all using (is_admin());
create policy "rid_rw" on riding_reports for all
  using (student_id in (select my_student_ids()) or is_admin())
  with check (student_id in (select my_student_ids()) or is_admin());
create policy "ovn_rw" on overnight_leave_requests for all
  using (student_id in (select my_student_ids()) or is_admin())
  with check (student_id in (select my_student_ids()) or is_admin());
create policy "meal_read" on meal_records for select
  using (student_id in (select my_student_ids()) or is_admin());
create policy "meal_admin" on meal_records for all using (is_admin());
create policy "blk_admin" on bulk_messages for all using (is_admin());
create policy "ntf_admin" on notifications for all using (is_admin());
create policy "ssv_read" on student_surveys for select using (auth.uid() is not null);
create policy "ssv_admin" on student_surveys for all using (is_admin());
create policy "ssr_rw" on student_survey_responses for all
  using (student_id in (select my_student_ids()) or is_admin())
  with check (student_id in (select my_student_ids()) or is_admin());
create policy "hms_read" on horse_monthly_summaries for select
  using ((shared and auth.uid() is not null) or is_admin());
create policy "hms_admin" on horse_monthly_summaries for all using (is_admin());
create policy "sup_read" on supporters for select using (user_id = auth.uid() or is_admin());
create policy "sup_admin" on supporters for all using (is_admin());
