import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile, roleHome } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import SiteLogo from "@/components/site-logo";
import { Section, PageHeader } from "@/components/ui";
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
    <div className="app-shell min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex w-full items-stretch">
          <SiteLogo variant="brand" href="/" className="shrink-0" />
          <div className="flex flex-1 items-center justify-end px-[5vw]">
            <Link
              href={roleHome(profile.role)}
              className="border border-gray-800 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-800 hover:text-white"
            >
              ← ホームへ戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <PageHeader
          title="個人情報の変更"
          description={`${ROLE_LABELS[profile.role] ?? ""}アカウントの登録情報を編集できます`}
        />
        <Section>
          <AccountForm profile={profile} birthDate={lead?.birth_date ?? null} />
        </Section>
      </main>
    </div>
  );
}
