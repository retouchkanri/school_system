import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { Toaster } from "sonner";
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
  icons: {
    icon: [{ url: "/images/pubicon.png", type: "image/png" }],
    apple: [{ url: "/images/pubicon.png", type: "image/png" }],
    shortcut: "/images/pubicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <TopButton />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
