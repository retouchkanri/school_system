import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "東関東馬事学院へのお問い合わせフォーム",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <ContactForm />
    </div>
  );
}
