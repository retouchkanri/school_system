/**
 * 公式サイト連携の一元定義。
 *
 * 学院の公式サイトは 2 つあり、それぞれ別ドメインで運用されている。
 *   - 東関東馬事高等学院 (高等課程) … https://bajigakuin.jp
 *   - 東関東馬事専門学院 (専門課程) … https://bajigakuin.net
 *
 * 本システム側から公式サイトへ送客するリンクは、必ずこのファイルの定義を経由する。
 * ドメイン移転やページ追加があった場合も、ここだけを直せば
 * トップページ・フッター・ヘッダー・マイページ(体験申込導線)・AIチャットに一斉反映される。
 *
 * ※ 旧ドメイン (bajigaku.net / bajigaku.site) は参照しない。
 *    public/images/bajigaku/ の写真は旧サイトから取得した実体を同梱しているため、
 *    site-images.ts の source は取得元の記録としてそのまま残している。
 */

export type OfficialSiteKey = "koutou" | "senmon";

export type OfficialLink = {
  /** 表示ラベル */
  label: string;
  /** origin からの相対パス (先頭スラッシュ付き) */
  path: string;
  /** 学院カードの主要リンク行に出すか (トップページで使用) */
  primary?: boolean;
};

export type OfficialSite = {
  key: OfficialSiteKey;
  /** 正式名称 */
  name: string;
  /** 課程の別 (高等課程 / 専門課程) */
  division: string;
  /** 英字表記 */
  en: string;
  /** 公式サイトの origin (末尾スラッシュなし) */
  origin: string;
  /** 画面に出す表示用ドメイン */
  domain: string;
  tagline: string;
  /** 代表電話 (ハイフンあり・表示用) */
  tel: string;
  address: string;
  /** COURSES と同じ表記。希望学科から公式サイトを引くために使う */
  course: string;
  /**
   * 公式サイト側の資料請求ページ。
   * null の場合は公式サイトに資料請求ページが無く、本システムの /request が受け皿になる。
   */
  documentPath: string | null;
  /** オープンキャンパス・体験入学の申込ページ */
  openCampusPath: string;
  /** お問い合わせフォーム */
  contactPath: string;
  /** 主要ページ一覧 (フッター・学院カードのリンク集に使用) */
  links: OfficialLink[];
};

/** 東関東馬事高等学院 (高等課程) — https://bajigakuin.jp */
const KOUTOU: OfficialSite = {
  key: "koutou",
  name: "東関東馬事高等学院",
  division: "高等課程",
  en: "HIGASHIKANTO BAJI HIGH SCHOOL",
  origin: "https://bajigakuin.jp",
  domain: "bajigakuin.jp",
  tagline: "勉強は最低限！夢は最大限！",
  tel: "050-6875-3336",
  address: "千葉県山武市雨坪10番地",
  course: "東関東馬事高等学院(高等課程)",
  documentPath: null, // 公式サイトに資料請求ページが無いため本システムの /request へ誘導する
  openCampusPath: "/opencampus",
  contactPath: "/contact",
  links: [
    { label: "本校の特徴", path: "/tokucho", primary: true },
    { label: "コース紹介", path: "/course", primary: true },
    { label: "募集要項", path: "/boshu", primary: true },
    { label: "学校見学・オープンキャンパス", path: "/opencampus", primary: true },
    { label: "JRA厩務員", path: "/kyumuin" },
    { label: "騎手", path: "/jockey" },
    { label: "騎手受験事前合宿", path: "/camp" },
    { label: "競走馬の牧場", path: "/bokujo" },
    { label: "馬術競技", path: "/bajutsu" },
    { label: "引退馬サポート", path: "/intaiba" },
    { label: "進学", path: "/shingaku" },
    { label: "不登校対応", path: "/support" },
    { label: "学校概要", path: "/gaiyo" },
    { label: "お知らせ", path: "/news" },
    { label: "よくある質問", path: "/qa" },
  ],
};

/** 東関東馬事専門学院 (専門課程) — https://bajigakuin.net */
const SENMON: OfficialSite = {
  key: "senmon",
  name: "東関東馬事専門学院",
  division: "専門課程",
  en: "HIGASHIKANTO BAJI COLLEGE",
  origin: "https://bajigakuin.net",
  domain: "bajigakuin.net",
  tagline: "未経験からJRA厩務員へ。業界一体型の信頼と実績",
  tel: "050-6875-3336",
  address: "千葉県山武市雨坪10番地",
  course: "東関東馬事専門学院(専門課程)",
  documentPath: "/contact?type=document",
  openCampusPath: "/opencampus",
  contactPath: "/contact",
  links: [
    { label: "学校の特長", path: "/features", primary: true },
    { label: "学び・コース", path: "/curriculum", primary: true },
    { label: "入学案内", path: "/admission", primary: true },
    { label: "オープンキャンパス", path: "/opencampus", primary: true },
    { label: "JRA厩務員", path: "/jra" },
    { label: "選ばれる理由", path: "/comparison" },
    { label: "学校案内", path: "/about" },
    { label: "よくある質問", path: "/faq" },
  ],
};

export const OFFICIAL_SITES: Record<OfficialSiteKey, OfficialSite> = {
  koutou: KOUTOU,
  senmon: SENMON,
};

/** 表示順 (高等学院 → 専門学院) で並べた一覧 */
export const OFFICIAL_SITE_LIST: OfficialSite[] = [KOUTOU, SENMON];

/**
 * 公式サイトの絶対URLを組み立てる。
 * path 未指定ならトップページ。path はクエリ付き ("/contact?type=document") でもよい。
 */
export function officialUrl(site: OfficialSite, path = "/"): string {
  return `${site.origin}${path === "/" ? "/" : path}`;
}

/** オープンキャンパス・体験入学の申込先 */
export function openCampusUrl(site: OfficialSite): string {
  return officialUrl(site, site.openCampusPath);
}

/** お問い合わせフォーム */
export function contactUrl(site: OfficialSite): string {
  return officialUrl(site, site.contactPath);
}
