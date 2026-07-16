import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "東関東馬事高等学院・専門学院 統合管理システム",
    template: "%s | 東関東馬事学院",
  },
  description: "資料請求から入学、在校生管理までを一元化する馬事学院統合プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
