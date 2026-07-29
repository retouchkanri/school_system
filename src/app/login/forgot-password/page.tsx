import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import { KOUTOU_IMAGES } from "@/lib/site-images";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen">
      <FullPageBackground src={KOUTOU_IMAGES.campus2.src} alt={KOUTOU_IMAGES.campus2.alt} tone="neutral" />
      <SiteHeader />
      <ForgotPasswordForm />
    </div>
  );
}
