import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { DECISION_DOCUMENTS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { Card, PageHeader, btnPrimary } from "@/components/ui";
import type { AdmissionDecision } from "@/lib/types";

export default async function ResultPage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="合否確認" />
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

  const { data } = await adminDb().from("admission_decisions").select("*").eq("lead_id", lead.id).maybeSingle();
  const decision = (data as AdmissionDecision | null) ?? null;

  // 未通知 → 選考中
  if (!decision || !decision.notified_at) {
    return (
      <div>
        <PageHeader title="合否確認" description="選考結果はこちらのページでご確認いただけます" />
        <Card>
          <div className="py-10 text-center">
            <p className="text-4xl">⏳</p>
            <p className="mt-4 text-base font-bold text-gray-800">現在、選考中です</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              結果が出ましたら、こちらのページとメール・LINEでお知らせいたします。
              <br />
              今しばらくお待ちください。
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // 合格
  if (decision.result === "accepted") {
    const sentDocs = DECISION_DOCUMENTS.filter((d) => decision.documents_sent[d.key] === true);
    return (
      <div>
        <PageHeader title="合否確認" description={`通知日: ${fmtDate(decision.notified_at)}`} />

        <div className="mb-6 overflow-hidden border border-pink-200 bg-pink-50/60 p-8 text-center shadow-sm">
          <p className="text-5xl">🌸</p>
          <h2 className="mt-4 text-2xl font-bold text-pink-700">合格おめでとうございます!</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-600">
            {lead.name}さん、厳正なる選考の結果、あなたの入学を心より歓迎いたします。
            馬とともに学ぶ新しい生活が、まもなく始まります。
            教職員・在校生・そして馬たち一同、お会いできる日を楽しみにしています。
          </p>
          <Link href="/mypage/enrollment" className={`${btnPrimary} mt-6`}>
            入学手続きへ進む →
          </Link>
        </div>

        <Card title="ご案内した書類">
          {sentDocs.length === 0 ? (
            <p className="text-sm text-gray-500">書類は準備中です。お手元に届くまでお待ちください。</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {sentDocs.map((d) => (
                <li
                  key={d.key}
                  className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800"
                >
                  ✓ {d.label}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-gray-400">
            ※ 書類の到着まで今しばらくお待ちください。届かない場合や紛失された場合は、学院までお問い合わせください。
          </p>
        </Card>
      </div>
    );
  }

  // 補欠
  if (decision.result === "waitlist") {
    return (
      <div>
        <PageHeader title="合否確認" description={`通知日: ${fmtDate(decision.notified_at)}`} />
        <div className="border border-amber-200 bg-amber-50/50 p-8 shadow-sm">
          <p className="text-center text-4xl">📋</p>
          <h2 className="mt-4 text-center text-xl font-bold text-amber-700">補欠合格のお知らせ</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-600">
            {lead.name}さん、選考の結果、補欠合格となりました。
            定員に空きが生じた場合、順次繰り上げ合格のご連絡をいたします。
            繰り上げの際はお電話とメール・LINEでご連絡いたしますので、連絡の取れる状態でお待ちください。
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
            ご不明な点やご不安なことがございましたら、いつでも学院までお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  // 不合格
  const rejectedSentDocs = DECISION_DOCUMENTS.filter((d) => decision.documents_sent[d.key] === true);
  return (
    <div>
      <PageHeader title="合否確認" description={`通知日: ${fmtDate(decision.notified_at)}`} />
      <Card className="mb-6">
        <div className="px-2 py-8">
          <p className="text-center text-4xl">🍀</p>
          <h2 className="mt-4 text-center text-xl font-bold text-gray-800">選考結果のお知らせ</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-600">
            {lead.name}さん、このたびは本学院への出願、誠にありがとうございました。
            厳正なる選考の結果、誠に残念ながら今回はご期待に沿えない結果となりました。
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
            馬の世界への道はひとつではありません。あなたのこれからの歩みが実り多きものとなるよう、
            教職員一同心よりお祈り申し上げます。再チャレンジのご相談も随時受け付けております。
          </p>
        </div>
      </Card>

      {rejectedSentDocs.length > 0 && (
        <Card title="ご案内した書類">
          <ul className="grid gap-2 sm:grid-cols-2">
            {rejectedSentDocs.map((d) => (
              <li
                key={d.key}
                className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700"
              >
                ✓ {d.label}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
