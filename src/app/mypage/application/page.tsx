import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { APPLICATION_DOCUMENTS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getApplicationDocumentSignedUrl, isApplicationDocumentFile } from "@/lib/documents";
import { Card, PageHeader, Badge, btnPrimary, type BadgeTone } from "@/components/ui";
import type { Application, ApplicationStatus } from "@/lib/types";
import ApplicationForm from "./application-form";
import ApplicationDocumentsPanel from "./documents-panel";

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  draft: "gray",
  submitted: "blue",
  under_review: "amber",
  interview_scheduled: "purple",
  decided: "green",
};

export default async function ApplicationPage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="出願" />
        <Card>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { data } = await adminDb().from("applications").select("*").eq("lead_id", lead.id).maybeSingle();
  const application = (data as Application | null) ?? null;

  // 提出済み → 内容表示
  if (application && application.status !== "draft") {
    const docs = await Promise.all(
      APPLICATION_DOCUMENTS.map(async (doc) => {
        if (doc.kind === "text") {
          return { key: doc.key, label: doc.label, kind: doc.kind, submitted: !!application.essay?.trim(), url: null as string | null };
        }
        const file = application.documents[doc.key];
        const valid = isApplicationDocumentFile(file);
        const url = valid ? await getApplicationDocumentSignedUrl(file.path) : null;
        return { key: doc.key, label: doc.label, kind: doc.kind, submitted: valid, url };
      })
    );
    const editable = application.status !== "decided";

    return (
      <div>
        <PageHeader
          title="出願"
          description="出願内容と選考状況をご確認いただけます"
          action={<Badge tone={STATUS_TONE[application.status]}>{APPLICATION_STATUS_LABELS[application.status]}</Badge>}
        />

        {application.interview_date && (
          <div className="mb-6 border border-purple-200 bg-purple-50/50 p-6 text-center shadow-sm">
            <p className="text-xs font-bold text-purple-600">面接日が決定しました</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{fmtDate(application.interview_date)}</p>
            <p className="mt-2 text-sm text-gray-500">
              当日は生徒手帳(身分証)をお持ちのうえ、開始15分前までにお越しください。
            </p>
          </div>
        )}

        <ApplicationDocumentsPanel docs={docs} essay={application.essay} editable={editable} />

        <p className="text-xs text-gray-400">提出日時: {fmtDateTime(application.submitted_at)}</p>

        <div className="mt-6 border border-brand-200 bg-brand-50 p-5 text-center">
          <p className="text-sm font-bold text-brand-700">次のステップ: 性格・適性検査</p>
          <p className="mt-1 text-sm text-gray-600">出願後は適性検査(100問)の受検をお願いしています。</p>
          <Link href="/mypage/aptitude" className={`${btnPrimary} mt-3`}>
            適性検査へ進む →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="出願"
        description="提出書類のアップロードと作文の提出を行ってください"
      />
      <ApplicationForm />
    </div>
  );
}
