import { redirect } from "next/navigation";
import { getSessionProfile, roleHome } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import LoginContent from "./login-content";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(roleHome(profile.role));

  return (
    <div className="min-h-screen bg-brand-50/40">
      <SiteHeader />
      <LoginContent />
    </div>
  );
}
