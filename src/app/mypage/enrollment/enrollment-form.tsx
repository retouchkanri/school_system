"use client";

import { useActionState, useEffect } from "react";
import { UNIFORM_SIZES, BOOTS_SIZES, HELMET_SIZES } from "@/lib/constants";
import { Card, Field, Label, inputCls, btnPrimary } from "@/components/ui";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { saveEnrollmentAction, type ActionState } from "./actions";
import IdDocumentsSection from "./id-document-upload";
import type { EnrollmentProcedure } from "@/lib/types";

const AGREEMENT_TEXT = `東関東馬事学院 入学規約

第1条(目的)
本規約は、東関東馬事高等学院・東関東馬事専門学院(以下「本学院」)への入学および在学中の生活に関する基本事項を定めるものです。

第2条(教育方針)
本学院は、馬とともに学ぶ実践教育を通じて、生徒一人ひとりの自立と社会性の育成を目指します。生徒は本学院の教育方針を理解し、誠実に学業および実習に取り組むものとします。

第3条(寮生活)
1. 生徒は原則として学院寮に入寮し、共同生活の規則(起床・消灯時間、清掃当番、外出・外泊の届出等)を守るものとします。
2. 外泊には保護者の承認と学院への事前申請が必要です。

第4条(馬の取り扱い)
1. 生徒は担当馬の飼養管理に責任を持ち、スタッフの指導のもと安全に配慮して作業・騎乗を行うものとします。
2. 馬への虐待行為・安全を脅かす行為は厳格に禁止します。

第5条(学納金)
1. 入学金・授業料・寮費・教材費等は所定の期日までに納入するものとします。
2. 一度納入された入学金は、原則として返還いたしません。

第6条(健康管理)
持病・アレルギー・服薬等の健康情報は、入学手続き時に正確に申告するものとします。申告内容は生徒の安全確保の目的にのみ使用します。

第7条(退学・処分)
本規約または学院の諸規則に著しく違反した場合、指導・停学・退学等の処分を行うことがあります。

第8条(個人情報)
本学院は、生徒および保護者の個人情報を教育目的および緊急時の連絡にのみ使用し、適切に管理します。

以上の内容に同意のうえ、入学手続きを行ってください。`;

export default function EnrollmentForm({
  procedure,
  documentUrls,
}: {
  procedure: EnrollmentProcedure | null;
  documentUrls: Record<string, string | null>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveEnrollmentAction, {});

  useEffect(() => {
    if (state.error) showErrorToast(state.error);
    if (state.ok) showSuccessToast("手続き内容を保存しました");
  }, [state]);

  const ec = (i: number) => procedure?.emergency_contacts?.[i] ?? { name: "", relation: "", phone: "" };
  const g = procedure?.guarantor ?? {};

  const checkLabelCls =
    "flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700";

  return (
    <form action={formAction} className="space-y-6">
      <Card title="1. 提出物の確認">
        <p className="mb-3 text-xs text-gray-500">
          以下の書類の画像をアップロードしてください。表面・裏面それぞれをタップして選択できます。
        </p>
        <IdDocumentsSection documentUrls={documentUrls} />
      </Card>

      <Card title="2. 制服・装具のサイズ">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="制服サイズ">
            <select name="uniform_size" defaultValue={procedure?.uniform_size ?? ""} className={inputCls}>
              <option value="">選択してください</option>
              {UNIFORM_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ブーツサイズ (cm)">
            <select name="boots_size" defaultValue={procedure?.boots_size ?? ""} className={inputCls}>
              <option value="">選択してください</option>
              {BOOTS_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ヘルメットサイズ">
            <select name="helmet_size" defaultValue={procedure?.helmet_size ?? ""} className={inputCls}>
              <option value="">選択してください</option>
              {HELMET_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className={`${checkLabelCls} mt-4 sm:max-w-xs`}>
          <input
            type="checkbox"
            name="drivers_license"
            defaultChecked={procedure?.drivers_license ?? false}
            className="accent-brand-600"
          />
          自動車免許を持っている
        </label>
      </Card>

      <Card title="3. 緊急連絡先 (2件までご記入いただけます)">
        {[1, 2].map((i) => {
          const c = ec(i - 1);
          return (
            <div key={i} className="mb-4 last:mb-0">
              <Label required={i === 1}>緊急連絡先 {i}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  name={`ec${i}_name`}
                  defaultValue={c.name}
                  required={i === 1}
                  className={inputCls}
                  placeholder="氏名"
                />
                <input
                  name={`ec${i}_relation`}
                  defaultValue={c.relation}
                  className={inputCls}
                  placeholder="続柄 (例: 母)"
                />
                <input
                  name={`ec${i}_phone`}
                  defaultValue={c.phone}
                  required={i === 1}
                  className={inputCls}
                  placeholder="電話番号"
                />
              </div>
            </div>
          );
        })}
      </Card>

      <Card title="4. 保証人">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="氏名" required>
            <input name="g_name" defaultValue={g.name ?? ""} required className={inputCls} placeholder="氏名" />
          </Field>
          <Field label="続柄">
            <input name="g_relation" defaultValue={g.relation ?? ""} className={inputCls} placeholder="例: 父" />
          </Field>
          <Field label="電話番号">
            <input name="g_phone" defaultValue={g.phone ?? ""} className={inputCls} placeholder="電話番号" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="住所">
            <input name="g_address" defaultValue={g.address ?? ""} className={inputCls} placeholder="住所" />
          </Field>
        </div>
      </Card>

      <Card title="5. 健康情報">
        <div className="space-y-3">
          <Field label="アレルギー">
            <input
              name="allergies"
              defaultValue={procedure?.allergies ?? ""}
              className={inputCls}
              placeholder="なければ「なし」"
            />
          </Field>
          <Field label="常備薬">
            <input
              name="medications"
              defaultValue={procedure?.medications ?? ""}
              className={inputCls}
              placeholder="なければ「なし」"
            />
          </Field>
          <Field label="持病">
            <input
              name="medical_conditions"
              defaultValue={procedure?.medical_conditions ?? ""}
              className={inputCls}
              placeholder="なければ「なし」"
            />
          </Field>
        </div>
      </Card>

      <Card title="6. 入学規約への同意・電子署名">
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          {AGREEMENT_TEXT}
        </div>
        <label className={`${checkLabelCls} mt-4`}>
          <input
            type="checkbox"
            name="agreement"
            defaultChecked={procedure?.agreement_accepted ?? false}
            className="accent-brand-600"
          />
          入学規約の内容を確認し、同意します
        </label>
        <div className="mt-4">
          <Field label="電子署名 (氏名をフルネームでご入力ください)">
            <input
              name="signature"
              defaultValue={procedure?.signature ?? ""}
              className={inputCls}
              placeholder="例: 馬事 太郎"
            />
          </Field>
          <p className="mt-1 text-xs text-gray-400">
            ※ 同意チェックと電子署名の両方が完了すると、手続きステータスが「完了」になります。途中保存も可能です。
          </p>
        </div>
      </Card>

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3`}>
        {pending ? "送信中…" : "手続き内容を保存する"}
      </button>
    </form>
  );
}
