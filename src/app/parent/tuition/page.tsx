import { requireRole } from "@/lib/auth";
import { getStudentsForParent } from "@/lib/data";
import { Card, PageHeader, EmptyState, SectionTitle } from "@/components/ui";
import { todayJst } from "@/app/admin/tuition/data";
import BankTransferInfo from "@/app/admin/tuition/bank-info";
import {
  FamilyTuitionStats,
  FamilyTuitionTable,
  loadTuitionPayments,
  summarizeTuition,
} from "@/app/admin/tuition/family-view";

export default async function ParentTuitionPage() {
  const profile = await requireRole("parent");
  // 自分の子 (parent_user_id が自分) のみを取得する
  const students = await getStudentsForParent(profile.id);

  if (students.length === 0) {
    return (
      <div>
        <PageHeader title="学費" />
        <Card>
          <EmptyState message="お子様の生徒情報が登録されていません。学院までお問い合わせください。" />
        </Card>
      </div>
    );
  }

  const today = todayJst();
  const payments = await loadTuitionPayments(students.map((s) => s.id));

  return (
    <div>
      <PageHeader title="学費" description="お子様の学費の請求と納付状況をご確認いただけます" />

      {students.map((student) => {
        const own = payments.filter((p) => p.student_id === student.id);
        return (
          <div key={student.id}>
            <SectionTitle>
              {student.name}({student.student_number})
            </SectionTitle>
            <FamilyTuitionStats summary={summarizeTuition(own, today)} />
            <FamilyTuitionTable payments={own} today={today} />
          </div>
        );
      })}

      <SectionTitle>お支払いについて</SectionTitle>
      <BankTransferInfo />
      <p className="mt-3 text-xs text-gray-400">
        ※ 表示は学院が確認できた内容です。お振込から反映まで数日いただく場合があります。ご不明な点は学院までお問い合わせください。
      </p>
    </div>
  );
}
