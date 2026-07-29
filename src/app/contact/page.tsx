import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import { SENMON_IMAGES } from "@/lib/site-images";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "東関東馬事学院へのお問い合わせフォーム",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <FullPageBackground src={SENMON_IMAGES.kankyoReception.src} alt={SENMON_IMAGES.kankyoReception.alt} tone="neutral" />
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">お問い合わせ</h1>
          <p className="mt-1 text-sm text-gray-500">
            学院へのご質問・ご相談はこちらからお送りください。担当者よりご連絡いたします。
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
