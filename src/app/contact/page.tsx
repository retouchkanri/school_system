import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "東関東馬事学院へのお問い合わせフォーム",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <FullPageBackground
        src="/images/contact.jpg"
        alt="東関東馬事学院の校舎外観"
        tone="clear"
      />
      <SiteHeader />
      <ContactForm />
    </div>
  );
}
