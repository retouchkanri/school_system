/**
 * ポータル共通ナビの項目定義。
 * 実際の描画は左サイドバー (components/portal-sidebar.tsx) が行う。
 */
export interface PortalNavItem {
  href: string;
  label: string;
  /**
   * この項目配下のページ。指定すると、その項目が選択されている間だけ
   * サイドバーにページ単位のサブ項目を表示する。
   */
  children?: { href: string; label: string }[];
  /**
   * 項目に添えるアイコン。モバイルのアイコンレールで使うため原則すべての項目に指定する。
   * サーバーコンポーネントから渡すため、コンポーネント参照ではなく
   * 描画済みの要素 (例: <Compass className="h-4 w-4" />) を渡すこと。
   */
  icon?: React.ReactNode;
}
