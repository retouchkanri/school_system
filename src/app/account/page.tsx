import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile, roleHome } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import SiteLogo from "@/components/site-logo";
import FullPageBackground from "@/components/full-page-background";
import { KOUTOU_IMAGES } from "@/lib/site-images";
import { Card, PageHeader } from "@/components/ui";
import AccountForm from "./account-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "職員",
  applicant: "入学希望者",
  student: "在校生",
  parent: "保護者",
  supporter: "一口支援者",
};

export default async function AccountPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const { data: lead } = await adminDb()
    .from("leads")
    .select("birth_date")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <FullPageBackground src={KOUTOU_IMAGES.campus1.src} alt={KOUTOU_IMAGES.campus1.alt} tone="neutral" />
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/90 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-[5vw] py-4">
          <SiteLogo href="/" />
          <Link
            href={roleHome(profile.role)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            ← ホームへ戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <PageHeader
          title="個人情報の変更"
          description={`${ROLE_LABELS[profile.role] ?? ""}アカウントの登録情報を編集できます`}
        />
        <Card>
          <AccountForm profile={profile} birthDate={lead?.birth_date ?? null} />
        </Card>
      </main>
    </div>
  );
}
