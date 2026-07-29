import { redirect } from "next/navigation";
import { getSessionProfile, roleHome } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import { KOUTOU_IMAGES } from "@/lib/site-images";
import LoginContent from "./login-content";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect(roleHome(profile.role));

  return (
    <div className="min-h-screen">
      <FullPageBackground src={KOUTOU_IMAGES.campus2.src} alt={KOUTOU_IMAGES.campus2.alt} tone="neutral" />
      <SiteHeader />
      <LoginContent />
    </div>
  );
}
