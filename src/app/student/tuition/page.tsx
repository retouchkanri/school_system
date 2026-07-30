import { requireRole } from "@/lib/auth";
import { getStudentForUser } from "@/lib/data";
import { Card, PageHeader, EmptyState, SectionTitle } from "@/components/ui";
import { todayJst } from "@/app/admin/tuition/data";
import BankTransferInfo from "@/app/admin/tuition/bank-info";
import {
  FamilyTuitionStats,
  FamilyTuitionTable,
  loadTuitionPayments,
  summarizeTuition,
} from "@/app/admin/tuition/family-view";

export default async function StudentTuitionPage() {
  const profile = await requireRole("student");
  const student = await getStudentForUser(profile.id);

  if (!student) {
    return (
      <div>
        <PageHeader title="学費" />
        <Card>
          <EmptyState message="生徒情報が登録されていません。学院までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const today = todayJst();
  const payments = await loadTuitionPayments([student.id]);
  const summary = summarizeTuition(payments, today);

  return (
    <div>
      <PageHeader title="学費" description="学費の請求と納付状況をご確認いただけます" />

      <FamilyTuitionStats summary={summary} />
      <FamilyTuitionTable payments={payments} today={today} />

      <SectionTitle>お支払いについて</SectionTitle>
      <BankTransferInfo />
      <p className="mt-3 text-xs text-gray-400">
        ※ 表示は学院が確認できた内容です。お振込から反映まで数日いただく場合があります。ご不明な点は学院までお問い合わせください。
      </p>
    </div>
  );
}
