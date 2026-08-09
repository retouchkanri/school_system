import Link from "next/link";
import { Crown } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getLeadForUser } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import { APTITUDE_TRAITS, SUITABILITY_LABELS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Section, PageHeader, Badge, btnPrimary } from "@/components/ui";
import type { AptitudeTest } from "@/lib/types";
import AptitudeForm from "./aptitude-form";

export default async function AptitudePage() {
  const profile = await requireRole("applicant");
  const lead = await getLeadForUser(profile.id);

  if (!lead) {
    return (
      <div>
        <PageHeader title="性格・適性検査" />
        <Section>
          <div className="py-6 text-center">
            <p className="mt-3 text-sm font-bold text-gray-800">資料請求がまだ紐づいていません</p>
            <p className="mt-2 text-sm text-gray-500">まずは資料請求フォームからお申し込みください。</p>
            <Link href="/request" className={`${btnPrimary} mt-5`}>
              資料請求フォームへ
            </Link>
          </div>
        </Section>
      </div>
    );
  }

  const { data } = await adminDb().from("aptitude_tests").select("*").eq("lead_id", lead.id).maybeSingle();
  const test = (data as AptitudeTest | null) ?? null;

  // 受検済み → 結果表示
  if (test) {
    const suitabilityRanked = Object.entries(SUITABILITY_LABELS)
      .map(([key, label]) => ({ key, label, score: test.suitability?.[key] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <div>
        <PageHeader
          title="性格・適性検査 結果"
          description={`受検日時: ${fmtDateTime(test.completed_at)}`}
          action={<Badge tone="green">受検済</Badge>}
        />

        <Section title="特性スコア (0〜100)" className="mb-6">
          <div className="space-y-4">
            {Object.entries(APTITUDE_TRAITS).map(([key, label]) => {
              const score = test.scores?.[key] ?? 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">{label}</span>
                    <span className="font-bold text-brand-700">{score}点</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="職業適性 (高い順)" className="mb-6">
          <div className="space-y-4">
            {suitabilityRanked.map((s, i) => (
              <div key={s.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                    {i === 0 && <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden />}
                    {s.label}
                  </span>
                  <span className={`font-bold ${i === 0 ? "text-amber-600" : "text-gray-600"}`}>{s.score}点</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gray-300"}`}
                    style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {test.ai_report && (
          <div className="mb-6 border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
            <p className="text-xs font-bold text-purple-600">AI分析レポート</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{test.ai_report}</p>
          </div>
        )}

        <div className="border border-brand-200 bg-brand-50 p-5 text-center">
          <p className="text-sm font-bold text-brand-700">次のステップ: 面接</p>
          <p className="mt-1 text-sm text-gray-600">面接日程は決まり次第、出願ページでご案内します。</p>
          <Link href="/mypage/application" className={`${btnPrimary} mt-3`}>
            出願内容・面接日を確認する →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="性格・適性検査"
        description="全100問・約10分。あなたの強みと向いている仕事が分かります。深く考えず、直感でお答えください。"
      />
      <AptitudeForm />
    </div>
  );
}
