/**
 * 公式サイト (bajigaku.net / bajigaku.site) から取得した画像データベース。
 * 画像本体は public/images/bajigaku/ に保存済み。
 * source は取得元 URL（公式サイト側で差し替えがあった場合の再取得用）。
 */

export type SiteImage = {
  /** 画像パス (public 配下) */
  src: string;
  /** 代替テキスト */
  alt: string;
  /** 取得元 URL */
  source: string;
  /** 撮影・掲載内容の分類 */
  category:
    | "logo"
    | "campus"
    | "riding"
    | "facility"
    | "dorm"
    | "course"
    | "future"
    | "feature"
    | "event"
    | "horse"
    | "banner"
    | "icon"
    | "classroom"
    | "uniform"
    | "reception";
  /** どちらの学院か */
  school: "koutou" | "senmon";
};

const NET = "https://bajigaku.net/wp-content/uploads";
const SITE_THEME = "https://bajigaku.site/wp-content/themes/responsive_261";
const SITE_UP = "https://bajigaku.site/wp-content/uploads";
const DIR = "/images/bajigaku";

/** 東関東馬事高等学院 (bajigaku.net) の画像 */
export const KOUTOU_IMAGES = {
  logo: { src: `${DIR}/net-logo.png`, alt: "東関東馬事高等学院 ロゴ", source: `${NET}/2021/11/logo.png`, category: "logo", school: "koutou" },
  heroLeft: { src: `${DIR}/net-hero-left.png`, alt: "東関東馬事高等学院 メインビジュアル(左)", source: `${NET}/2021/11/top_slider_left-2.png`, category: "campus", school: "koutou" },
  heroRight: { src: `${DIR}/net-hero-right.png`, alt: "東関東馬事高等学院 メインビジュアル(右)", source: `${NET}/2021/11/top_slider_right-2.png`, category: "campus", school: "koutou" },
  campus1: { src: `${DIR}/net-campus-1.jpg`, alt: "馬と過ごせる広大なキャンパス", source: `${NET}/2021/11/DSC_0028-scaled.jpg`, category: "campus", school: "koutou" },
  campus2: { src: `${DIR}/net-campus-2.jpg`, alt: "自然に囲まれた学び環境", source: `${NET}/2021/11/DSC_0073-scaled.jpg`, category: "campus", school: "koutou" },
  campus3: { src: `${DIR}/net-campus-3.jpg`, alt: "馬とともに過ごす学院生活", source: `${NET}/2021/11/DSC_2533-scaled.jpg`, category: "campus", school: "koutou" },
  campus4: { src: `${DIR}/net-campus-4.jpg`, alt: "キャンパスの馬たち", source: `${NET}/2022/01/DSC9265-scaled.jpg`, category: "campus", school: "koutou" },
  horseClose: { src: `${DIR}/net-horse-close.jpg`, alt: "馬とのふれあい", source: `${NET}/2022/02/pixta_80697440_XL-1-scaled.jpg`, category: "horse", school: "koutou" },
  cover: { src: `${DIR}/net-cover.jpg`, alt: "東関東馬事高等学院 キャンパス全景", source: `${NET}/2022/04/cover.jpg`, category: "campus", school: "koutou" },
  competition: { src: `${DIR}/net-competition.jpg`, alt: "乗馬一般馬術大会", source: `${NET}/2022/05/ippan_001_2.jpg`, category: "event", school: "koutou" },
  facility: { src: `${DIR}/net-facility.jpg`, alt: "小学校をリノベーションした校舎", source: `${NET}/2022/12/shisetsu_002_2.jpg`, category: "facility", school: "koutou" },
  tokucho: { src: `${DIR}/net-tokucho.jpg`, alt: "校外学習のようす", source: `${NET}/2023/05/tokucho_008_2.jpg`, category: "feature", school: "koutou" },
  riding1: { src: `${DIR}/net-riding-1.jpg`, alt: "騎乗授業のようす", source: `${NET}/2023/06/20210601_142538-scaled.jpg`, category: "riding", school: "koutou" },
  riding2: { src: `${DIR}/net-riding-2.jpg`, alt: "騎乗訓練", source: `${NET}/2023/06/DSC0132-scaled.jpg`, category: "riding", school: "koutou" },
  riding3: { src: `${DIR}/net-riding-3.jpg`, alt: "馬場での騎乗練習", source: `${NET}/2022/10/20220912_114631-scaled-e1670871506508.jpg`, category: "riding", school: "koutou" },
  photo1: { src: `${DIR}/net-photo-1.jpg`, alt: "学院のようす", source: `${NET}/2022/01/1-240.jpg`, category: "campus", school: "koutou" },
} as const;

/** 高等学院: 目指せる進路 (FUTURE) */
export const KOUTOU_FUTURE = [
  { src: `${DIR}/net-future-1.jpg`, alt: "JRA騎手", source: `${NET}/2022/02/top_future_001-1.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-2.jpg`, alt: "NAR地方競馬騎手", source: `${NET}/2022/02/top_future_002.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-3.jpg`, alt: "厩務員", source: `${NET}/2022/02/top_future_003.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-4.jpg`, alt: "生産牧場スタッフ", source: `${NET}/2022/02/top_future_004.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-5.jpg`, alt: "育成牧場スタッフ", source: `${NET}/2022/02/top_future_005.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-6.jpg`, alt: "乗馬クラブスタッフ", source: `${NET}/2022/02/top_future_006.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-7.jpg`, alt: "観光牧場スタッフ", source: `${NET}/2022/02/top_future_007.jpg`, category: "future", school: "koutou" },
  { src: `${DIR}/net-future-8.jpg`, alt: "養老牧場スタッフ", source: `${NET}/2022/02/top_future_008.jpg`, category: "future", school: "koutou" },
] as const;

/** 高等学院: コース紹介・学院の特徴・施設 */
export const KOUTOU_DETAIL = {
  course1: { src: `${DIR}/net-course-1.jpg`, alt: "一般高校乗馬コース", source: `${NET}/2023/06/top_course_001.jpg`, category: "course", school: "koutou" },
  course2: { src: `${DIR}/net-course-2.jpg`, alt: "騎手受験特別コース", source: `${NET}/2023/06/top_course_002.jpg`, category: "course", school: "koutou" },
  course3: { src: `${DIR}/net-course-3.jpg`, alt: "競走馬厩務員コース", source: `${NET}/2023/06/top_course_003.jpg`, category: "course", school: "koutou" },
  courseMap: { src: `${DIR}/net-course-map.jpg`, alt: "コース構成図", source: `${NET}/2023/05/course_001_1-2.jpg`, category: "course", school: "koutou" },
  ch1: { src: `${DIR}/net-ch-1.jpg`, alt: "バジガクチャンネル 1", source: `${NET}/2023/06/ch-01_001_1-4.jpg`, category: "feature", school: "koutou" },
  ch2: { src: `${DIR}/net-ch-2.jpg`, alt: "バジガクチャンネル 2", source: `${NET}/2023/06/ch-02_001_1.jpg`, category: "feature", school: "koutou" },
  ch3: { src: `${DIR}/net-ch-3.jpg`, alt: "バジガクチャンネル 3", source: `${NET}/2023/06/ch-03_001_1.jpg`, category: "feature", school: "koutou" },
  ch4: { src: `${DIR}/net-ch-4.jpg`, alt: "バジガクチャンネル 4", source: `${NET}/2023/06/ch-04_001_1.jpg`, category: "feature", school: "koutou" },
  ch5: { src: `${DIR}/net-ch-5.jpg`, alt: "バジガクチャンネル 5", source: `${NET}/2023/06/ch-05_001_1.jpg`, category: "feature", school: "koutou" },
  ch6: { src: `${DIR}/net-ch-6.jpg`, alt: "バジガクチャンネル 6", source: `${NET}/2023/06/ch-06_001_1.jpg`, category: "feature", school: "koutou" },
  ch7: { src: `${DIR}/net-ch-7.jpg`, alt: "バジガクチャンネル 7", source: `${NET}/2023/06/ch-07_001_1.jpg`, category: "feature", school: "koutou" },
  tokucho1: { src: `${DIR}/net-tokucho-1.jpg`, alt: "ウマと共に過ごせる高校生活3年間", source: `${NET}/2023/05/tokucho_001_1.jpg`, category: "feature", school: "koutou" },
  tokucho2: { src: `${DIR}/net-tokucho-2.jpg`, alt: "どんどん上達できる高校乗馬", source: `${NET}/2023/05/tokucho_002_1.jpg`, category: "feature", school: "koutou" },
  tokucho3: { src: `${DIR}/net-tokucho-3.jpg`, alt: "オリジナル作品などが高校単位に", source: `${NET}/2023/05/tokucho_003_1.jpg`, category: "feature", school: "koutou" },
  tokucho4: { src: `${DIR}/net-tokucho-4.jpg`, alt: "乗馬ライセンス・騎乗者資格を高校授業で取得", source: `${NET}/2023/05/tokucho_004_1.jpg`, category: "feature", school: "koutou" },
  tokucho5: { src: `${DIR}/net-tokucho-5.jpg`, alt: "九州へ3泊4日のスクーリング", source: `${NET}/2023/05/tokucho_005_1.jpg`, category: "feature", school: "koutou" },
  tokucho6: { src: `${DIR}/net-tokucho-6.jpg`, alt: "馬術競技への遠征・大会出場", source: `${NET}/2023/05/tokucho_006_1.jpg`, category: "feature", school: "koutou" },
  tokucho7: { src: `${DIR}/net-tokucho-7.jpg`, alt: "仲間たちと過ごす寮生活", source: `${NET}/2023/05/tokucho_007_1.jpg`, category: "feature", school: "koutou" },
  tokucho8: { src: `${DIR}/net-tokucho-8.jpg`, alt: "競馬場や牧場での校外学習", source: `${NET}/2023/05/tokucho_008_1.jpg`, category: "feature", school: "koutou" },
  shisetsuBaba: { src: `${DIR}/net-shisetsu-baba.jpg`, alt: "馬場(運動場)", source: `${NET}/2023/05/shisetsu_001_1.jpg`, category: "facility", school: "koutou" },
  shisetsuKyusha: { src: `${DIR}/net-shisetsu-kyusha.jpg`, alt: "厩舎(馬小屋)", source: `${NET}/2023/05/shisetsu_008_1.jpg`, category: "facility", school: "koutou" },
  shisetsuKosha: { src: `${DIR}/net-shisetsu-kosha.jpg`, alt: "校舎(全景)", source: `${NET}/2022/12/shisetsu_002_1.jpg`, category: "facility", school: "koutou" },
  shisetsuDorm: { src: `${DIR}/net-shisetsu-dorm.jpg`, alt: "学生寮(一人部屋)", source: `${NET}/2023/05/shisetsu_013_1.jpg`, category: "dorm", school: "koutou" },
  shisetsuShokudo: { src: `${DIR}/net-shisetsu-shokudo.jpg`, alt: "食堂スペース", source: `${NET}/2022/12/shisetsu_004_1.jpg`, category: "facility", school: "koutou" },
  shisetsuClassroom1: { src: `${DIR}/net-shisetsu-classroom-1.jpg`, alt: "音楽室を改装した明るい高校教室", source: `${NET}/2022/12/shisetsu_005_1.jpg`, category: "classroom", school: "koutou" },
  shisetsuClassroom2: { src: `${DIR}/net-shisetsu-classroom-2.jpg`, alt: "黒板のある専門教室", source: `${NET}/2022/12/shisetsu_006_1.jpg`, category: "classroom", school: "koutou" },
  shisetsuHall: { src: `${DIR}/net-shisetsu-hall.jpg`, alt: "授業や学校説明会で使う多目的ホール", source: `${NET}/2023/05/shisetsu_012_2.jpg`, category: "classroom", school: "koutou" },
  shisetsuLounge: { src: `${DIR}/net-shisetsu-lounge.jpg`, alt: "図書室を改装した生徒の休憩・多目的ルーム", source: `${NET}/2022/12/shisetsu_003_1.jpg`, category: "facility", school: "koutou" },
} as const;

/** 東関東馬事専門学院 (bajigaku.site) の画像 */
export const SENMON_IMAGES = {
  logo: { src: `${DIR}/site-logo.png`, alt: "東関東馬事専門学院 ロゴ", source: `${SITE_THEME}/images/logo.png`, category: "logo", school: "senmon" },
  banner1: { src: `${DIR}/site-banner-1.jpg`, alt: "業界一体型の信頼と実績", source: `${SITE_THEME}/img/top/ban_001.jpg`, category: "banner", school: "senmon" },
  banner2: { src: `${DIR}/site-banner-2.jpg`, alt: "未経験からJRA厩務員へ", source: `${SITE_THEME}/img/top/ban_002.jpg`, category: "banner", school: "senmon" },
  banner3: { src: `${DIR}/site-banner-3.jpg`, alt: "業界連携で報酬型の実習", source: `${SITE_THEME}/img/top/ban_003.jpg`, category: "banner", school: "senmon" },
  banner4: { src: `${DIR}/site-banner-4.jpg`, alt: "在学中に最大2回のJRA厩務員受験が可能", source: `${SITE_THEME}/img/top/ban_004.jpg`, category: "banner", school: "senmon" },
  banner5: { src: `${DIR}/site-banner-5.jpg`, alt: "授業費分割払い最大5年対応", source: `${SITE_THEME}/img/top/ban_005.jpg`, category: "banner", school: "senmon" },
  banner6: { src: `${DIR}/site-banner-6.jpg`, alt: "学びを経済面からも全面サポート", source: `${SITE_THEME}/img/top/ban_006.jpg`, category: "banner", school: "senmon" },
  feature1: { src: `${DIR}/site-feature-1.jpg`, alt: "本校の優位性", source: `${SITE_THEME}/img/top/toku_img_001.jpg`, category: "feature", school: "senmon" },
  feature2: { src: `${DIR}/site-feature-2.jpg`, alt: "学習環境(学生寮)", source: `${SITE_THEME}/img/top/toku_img_002.jpg`, category: "feature", school: "senmon" },
  feature3: { src: `${DIR}/site-feature-3.jpg`, alt: "受講スタイル", source: `${SITE_THEME}/img/top/toku_img_003.jpg`, category: "feature", school: "senmon" },
  feature4: { src: `${DIR}/site-feature-4.jpg`, alt: "質問Q&A", source: `${SITE_THEME}/img/top/toku_img_005.jpg`, category: "feature", school: "senmon" },
  kankyoMain: { src: `${DIR}/site-kankyo-main.jpg`, alt: "関東・関西で最大級の4つの施設", source: `${SITE_THEME}/img/kankyo/img_001_1.jpg`, category: "facility", school: "senmon" },
  kankyoTrack: { src: `${DIR}/site-kankyo-track.jpg`, alt: "1周150mの走路トラック", source: `${SITE_THEME}/img/kankyo/img_002_2.jpg`, category: "facility", school: "senmon" },
  kankyoMaruba: { src: `${DIR}/site-kankyo-maruba.jpg`, alt: "円形の丸馬場", source: `${SITE_THEME}/img/kankyo/img_002_11.jpg`, category: "facility", school: "senmon" },
  dormExt: { src: `${DIR}/site-dorm-ext.jpg`, alt: "学生寮(外観)", source: `${SITE_THEME}/img/kankyo/img_003_1.jpg`, category: "dorm", school: "senmon" },
  dormRoom: { src: `${DIR}/site-dorm-room.jpg`, alt: "全室個室の学生寮", source: `${SITE_THEME}/img/kankyo/img_003_2.jpg`, category: "dorm", school: "senmon" },
  dormMeal: { src: `${DIR}/site-dorm-meal.jpg`, alt: "365日提供される食事", source: `${SITE_THEME}/img/kankyo/img_004_1.jpg`, category: "dorm", school: "senmon" },
  tokuchoMain: { src: `${DIR}/site-tokucho-main.jpg`, alt: "本校の優位性", source: `${SITE_THEME}/img/tokucho/img_001_1.jpg`, category: "feature", school: "senmon" },
  tokuchoTanto: { src: `${DIR}/site-tokucho-tanto.jpg`, alt: "担当馬を持つ学生", source: `${SITE_THEME}/img/tokucho/img_002_2.jpg`, category: "horse", school: "senmon" },
  tokuchoRace: { src: `${DIR}/site-tokucho-race.jpg`, alt: "学校馬のレース出走", source: `${SITE_THEME}/img/tokucho/img_002_4.jpg`, category: "event", school: "senmon" },
  curriculumMain: { src: `${DIR}/site-curriculum-main.jpg`, alt: "未経験から学べるカリキュラム", source: `${SITE_THEME}/img/curriculum/img_001_1.jpg`, category: "course", school: "senmon" },
  taikenMain: { src: `${DIR}/site-taiken-main.jpg`, alt: "オープンキャンパス", source: `${SITE_THEME}/img/taiken/img_001_1.jpg`, category: "event", school: "senmon" },
  taikenRiding: { src: `${DIR}/site-taiken-riding.jpg`, alt: "乗馬体験", source: `${SITE_THEME}/img/taiken/img_002_1.jpg`, category: "event", school: "senmon" },
  taikenCare: { src: `${DIR}/site-taiken-care.jpg`, alt: "馬のお手入れ体験", source: `${SITE_THEME}/img/taiken/img_002_2.jpg`, category: "event", school: "senmon" },
  groupA1: { src: `${DIR}/site-group-a1.jpg`, alt: "学院グループ 1", source: `${SITE_THEME}/img_cmn/img_group_a1.jpg`, category: "banner", school: "senmon" },
  groupA2: { src: `${DIR}/site-group-a2.jpg`, alt: "学院グループ 2", source: `${SITE_THEME}/img_cmn/img_group_a2.jpg`, category: "banner", school: "senmon" },
  groupA3: { src: `${DIR}/site-group-a3.jpg`, alt: "学院グループ 3", source: `${SITE_THEME}/img_cmn/img_group_a3.jpg`, category: "banner", school: "senmon" },
  groupA4: { src: `${DIR}/site-group-a4.jpg`, alt: "学院グループ 4", source: `${SITE_THEME}/img_cmn/img_group_a4.jpg`, category: "banner", school: "senmon" },
  groupB1: { src: `${DIR}/site-group-b1.jpg`, alt: "学院グループ 5", source: `${SITE_THEME}/img_cmn/img_group_b1.jpg`, category: "banner", school: "senmon" },
  groupB2: { src: `${DIR}/site-group-b2.jpg`, alt: "学院グループ 6", source: `${SITE_THEME}/img_cmn/img_group_b2.jpg`, category: "banner", school: "senmon" },
  groupB3: { src: `${DIR}/site-group-b3.jpg`, alt: "学院グループ 7", source: `${SITE_THEME}/img_cmn/img_group_b3.jpg`, category: "banner", school: "senmon" },
  groupB4: { src: `${DIR}/site-group-b4.jpg`, alt: "学院グループ 8", source: `${SITE_THEME}/img_cmn/img_group_b4.jpg`, category: "banner", school: "senmon" },
  photo1: { src: `${DIR}/site-photo-1.jpg`, alt: "騎乗訓練のようす", source: `${SITE_UP}/2020/01/EOeudQPU4AA9TC6.jpg`, category: "riding", school: "senmon" },
  photo2: { src: `${DIR}/site-photo-2.jpg`, alt: "騎乗訓練", source: `${SITE_UP}/2020/04/120200120_111759-1024x683.jpg`, category: "riding", school: "senmon" },
  photo3: { src: `${DIR}/site-photo-3.jpg`, alt: "JRA競馬学校関連", source: `${SITE_UP}/2020/10/DSC_0079-1024x684.jpg`, category: "riding", school: "senmon" },
  photo4: { src: `${DIR}/site-photo-4.jpg`, alt: "学院のようす", source: `${SITE_UP}/2023/06/hbgv-11-1024x684.jpg`, category: "campus", school: "senmon" },
  photo5: { src: `${DIR}/site-photo-5.jpg`, alt: "関西研修施設ホースレスト", source: `${SITE_UP}/2024/03/20210726_214632-1024x576.jpg`, category: "facility", school: "senmon" },
  photo6: { src: `${DIR}/site-photo-6.jpg`, alt: "千葉の主要施設", source: `${SITE_UP}/2024/03/f655bd20238dcfddb00ee6ebf19ddbf5.jpg`, category: "facility", school: "senmon" },
  photo7: { src: `${DIR}/site-photo-7.jpg`, alt: "学生と馬たち", source: `${SITE_UP}/2024/12/241229144352761-1024x768.jpg`, category: "campus", school: "senmon" },
  photo8: { src: `${DIR}/site-photo-8.jpg`, alt: "冬のキャンパス", source: `${SITE_UP}/2024/12/241230154434244-1024x768.jpg`, category: "campus", school: "senmon" },
  photo9: { src: `${DIR}/site-photo-9.jpg`, alt: "学院の日常 1", source: `${SITE_UP}/2024/12/IMG_8817-1024x768.jpeg`, category: "campus", school: "senmon" },
  photo10: { src: `${DIR}/site-photo-10.jpg`, alt: "学院の日常 2", source: `${SITE_UP}/2024/12/IMG_8829-1024x768.jpeg`, category: "campus", school: "senmon" },
  photo11: { src: `${DIR}/site-photo-11.jpg`, alt: "学院の日常 3", source: `${SITE_UP}/2024/12/IMG_8890-1024x768.jpeg`, category: "campus", school: "senmon" },
  uniformBroadcast: { src: `${DIR}/site-uniform-broadcast.jpg`, alt: "制服姿の学生たちが授業中に競馬中継を観戦", source: `${SITE_THEME}/img/tokucho/img_002_6.jpg`, category: "uniform", school: "senmon" },
  classroomExamPrep: { src: `${DIR}/site-classroom-exam-prep.jpg`, alt: "JRA厩務員筆記試験対策の教室学習", source: `${SITE_THEME}/img/curriculum/img_002_4.jpg`, category: "classroom", school: "senmon" },
  kankyoOffice: { src: `${DIR}/site-kankyo-office.jpg`, alt: "教室や事務所のあるクラブハウス", source: `${SITE_THEME}/img/kankyo/img_002_5.jpg`, category: "reception", school: "senmon" },
  kankyoReception: { src: `${DIR}/site-kankyo-reception.jpg`, alt: "荷物の受け取りにも対応する管理室窓口", source: `${SITE_THEME}/img/kankyo/img_004_5.jpg`, category: "reception", school: "senmon" },
  kankyoDining: { src: `${DIR}/site-kankyo-dining.jpg`, alt: "学生寮の食堂スペース", source: `${SITE_THEME}/img/kankyo/img_004_3.jpg`, category: "dorm", school: "senmon" },
} as const;

/** 特徴アイコン (専門学院) */
export const SENMON_ICONS = [1, 2, 3, 4, 5].map((n) => ({
  src: `${DIR}/site-icon-${n}.png`,
  alt: `特徴アイコン ${n}`,
  source: `${SITE_THEME}/img/top/toku_icon_00${n}.png`,
  category: "icon" as const,
  school: "senmon" as const,
}));

/** 全画像の一覧 (管理画面などでの利用向け) */
export const ALL_SITE_IMAGES: SiteImage[] = [
  ...Object.values(KOUTOU_IMAGES),
  ...KOUTOU_FUTURE,
  ...Object.values(KOUTOU_DETAIL),
  ...Object.values(SENMON_IMAGES),
  ...SENMON_ICONS,
];

/** 公式サイトの URL */
export const OFFICIAL_SITES = {
  koutou: { name: "東関東馬事高等学院", url: "https://bajigaku.net/", tagline: "馬と過ごせる広大なキャンパスが学習の舞台" },
  senmon: { name: "東関東馬事専門学院", url: "https://bajigaku.site/", tagline: "未経験からJRA厩務員へ。業界一体型の信頼と実績" },
} as const;
