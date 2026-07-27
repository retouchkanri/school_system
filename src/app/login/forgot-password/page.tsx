import SiteHeader from "@/components/site-header";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <SiteHeader />
      <ForgotPasswordForm />
    </div>
  );
}
