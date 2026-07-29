/**
 * 各ポータル(マイページ/在校生/保護者/支援者)のタブごとに表示する
 * フルページ背景写真のマッピング。パスの前方一致で最も長く一致したものを採用する。
 * 画像は public/images/bajigaku/ の公式サイト画像データベース (src/lib/site-images.ts) から選定。
 */
import { KOUTOU_IMAGES, KOUTOU_DETAIL, KOUTOU_FUTURE, SENMON_IMAGES } from "@/lib/site-images";

export type PortalBackgroundEntry = {
  path: string;
  src: string;
  alt: string;
};

const ENTRIES: PortalBackgroundEntry[] = [
  // ---- 入学希望者マイページ ----
  { path: "/mypage/enrollee", src: KOUTOU_DETAIL.tokucho7.src, alt: KOUTOU_DETAIL.tokucho7.alt },
  { path: "/mypage/enrollment", src: SENMON_IMAGES.uniformBroadcast.src, alt: SENMON_IMAGES.uniformBroadcast.alt },
  { path: "/mypage/result", src: KOUTOU_IMAGES.cover.src, alt: KOUTOU_IMAGES.cover.alt },
  { path: "/mypage/aptitude", src: SENMON_IMAGES.classroomExamPrep.src, alt: SENMON_IMAGES.classroomExamPrep.alt },
  { path: "/mypage/application", src: KOUTOU_DETAIL.tokucho4.src, alt: KOUTOU_DETAIL.tokucho4.alt },
  { path: "/mypage/experience", src: SENMON_IMAGES.taikenCare.src, alt: SENMON_IMAGES.taikenCare.alt },
  { path: "/mypage/events", src: SENMON_IMAGES.taikenMain.src, alt: SENMON_IMAGES.taikenMain.alt },
  { path: "/mypage/survey", src: KOUTOU_DETAIL.shisetsuHall.src, alt: KOUTOU_DETAIL.shisetsuHall.alt },
  { path: "/mypage/video", src: KOUTOU_DETAIL.ch1.src, alt: KOUTOU_DETAIL.ch1.alt },
  { path: "/mypage/status", src: KOUTOU_IMAGES.campus4.src, alt: KOUTOU_IMAGES.campus4.alt },
  { path: "/mypage", src: KOUTOU_IMAGES.campus3.src, alt: KOUTOU_IMAGES.campus3.alt },

  // ---- 在校生ポータル ----
  { path: "/student/riding", src: KOUTOU_IMAGES.riding1.src, alt: KOUTOU_IMAGES.riding1.alt },
  { path: "/student/attendance", src: KOUTOU_IMAGES.campus1.src, alt: KOUTOU_IMAGES.campus1.alt },
  { path: "/student/trainings", src: KOUTOU_DETAIL.tokucho8.src, alt: KOUTOU_DETAIL.tokucho8.alt },
  { path: "/student/overnight", src: SENMON_IMAGES.dormExt.src, alt: SENMON_IMAGES.dormExt.alt },
  { path: "/student/meals", src: SENMON_IMAGES.dormMeal.src, alt: SENMON_IMAGES.dormMeal.alt },
  { path: "/student/grades", src: KOUTOU_DETAIL.shisetsuClassroom2.src, alt: KOUTOU_DETAIL.shisetsuClassroom2.alt },
  { path: "/student/competency", src: SENMON_IMAGES.feature1.src, alt: SENMON_IMAGES.feature1.alt },
  { path: "/student/career", src: KOUTOU_FUTURE[0].src, alt: KOUTOU_FUTURE[0].alt },
  { path: "/student/reimbursements", src: SENMON_IMAGES.banner5.src, alt: SENMON_IMAGES.banner5.alt },
  { path: "/student/surveys", src: KOUTOU_DETAIL.shisetsuLounge.src, alt: KOUTOU_DETAIL.shisetsuLounge.alt },
  { path: "/student/announcements", src: KOUTOU_IMAGES.campus2.src, alt: KOUTOU_IMAGES.campus2.alt },
  { path: "/student", src: KOUTOU_IMAGES.riding2.src, alt: KOUTOU_IMAGES.riding2.alt },

  // ---- 保護者ポータル ----
  { path: "/parent/overnight", src: SENMON_IMAGES.dormExt.src, alt: SENMON_IMAGES.dormExt.alt },
  { path: "/parent/attendance", src: KOUTOU_IMAGES.campus1.src, alt: KOUTOU_IMAGES.campus1.alt },
  { path: "/parent/meals", src: SENMON_IMAGES.kankyoDining.src, alt: SENMON_IMAGES.kankyoDining.alt },
  { path: "/parent/grades", src: KOUTOU_DETAIL.shisetsuClassroom1.src, alt: KOUTOU_DETAIL.shisetsuClassroom1.alt },
  { path: "/parent/competency", src: SENMON_IMAGES.feature1.src, alt: SENMON_IMAGES.feature1.alt },
  { path: "/parent/career", src: KOUTOU_FUTURE[2].src, alt: KOUTOU_FUTURE[2].alt },
  { path: "/parent/reimbursements", src: SENMON_IMAGES.banner5.src, alt: SENMON_IMAGES.banner5.alt },
  { path: "/parent/announcements", src: KOUTOU_IMAGES.campus4.src, alt: KOUTOU_IMAGES.campus4.alt },
  { path: "/parent", src: KOUTOU_DETAIL.tokucho7.src, alt: KOUTOU_DETAIL.tokucho7.alt },

  // ---- 一口支援者ポータル ----
  { path: "/supporter/announcements", src: KOUTOU_IMAGES.campus3.src, alt: KOUTOU_IMAGES.campus3.alt },
  { path: "/supporter", src: KOUTOU_IMAGES.horseClose.src, alt: KOUTOU_IMAGES.horseClose.alt },
];

// 前方一致が最も長いものを優先するため、パス長の降順に並べ替えておく
const SORTED_ENTRIES = [...ENTRIES].sort((a, b) => b.path.length - a.path.length);

const DEFAULT_BG = { src: KOUTOU_IMAGES.campus3.src, alt: KOUTOU_IMAGES.campus3.alt };

export function getPortalBackground(pathname: string): { src: string; alt: string } {
  const match = SORTED_ENTRIES.find((e) => pathname === e.path || pathname.startsWith(`${e.path}/`));
  return match ?? DEFAULT_BG;
}
