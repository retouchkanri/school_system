import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import FloatingContact from "@/components/floating-contact";
import TopButton from "@/components/top-button";
import "./globals.css";

const notoSans = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans" });
const notoSerif = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-noto-serif" });

export const metadata: Metadata = {
  title: {
    default: "東関東馬事高等学院・専門学院 統合管理システム",
    template: "%s | 東関東馬事学院",
  },
  description: "資料請求から入学、在校生管理までを一元化する馬事学院統合プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <FloatingContact />
        <TopButton />
      </body>
    </html>
  );
}
