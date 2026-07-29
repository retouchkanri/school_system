import Link from "next/link";
import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import { KOUTOU_IMAGES } from "@/lib/site-images";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen">
      <FullPageBackground src={KOUTOU_IMAGES.campus2.src} alt={KOUTOU_IMAGES.campus2.alt} tone="neutral" />
      <SiteHeader />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-gray-900">パスワードの再設定</h1>
            <p className="mt-1 text-sm text-gray-500">新しいパスワードを設定してください</p>
          </div>

          <div className="border border-gray-200 bg-white p-6 shadow-lg">
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                リンクが無効です。パスワード再設定を再度お申し込みください。
              </p>
            )}
          </div>

          <p className="mt-4 text-center text-sm">
            <Link href="/login/forgot-password" className="font-semibold text-brand-600 hover:underline">
              パスワード再設定をやり直す
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
