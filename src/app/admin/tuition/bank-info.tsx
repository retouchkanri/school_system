import { BANK_TRANSFER_INFO } from "@/lib/constants";

/**
 * 学費の振込先案内。
 * 既存の入学金・参加費と同じく `BANK_TRANSFER_INFO` (src/lib/constants.ts) を既定の表示とし、
 * 環境変数 BANK_TRANSFER_BANK_NAME / BRANCH / ACCOUNT_TYPE / ACCOUNT_NUMBER / ACCOUNT_HOLDER が
 * 設定されている場合はそちらを項目別に表示する (設定が無ければ従来どおりの1行表示)。
 *
 * サーバーコンポーネント (process.env をサーバー側で読む) なので、クライアント側からは import しないこと。
 */
export function bankTransferLines(): { label: string; value: string }[] {
  const entries: [string, string | undefined][] = [
    ["金融機関", process.env.BANK_TRANSFER_BANK_NAME],
    ["支店", process.env.BANK_TRANSFER_BRANCH],
    ["預金種別", process.env.BANK_TRANSFER_ACCOUNT_TYPE],
    ["口座番号", process.env.BANK_TRANSFER_ACCOUNT_NUMBER],
    ["口座名義", process.env.BANK_TRANSFER_ACCOUNT_HOLDER],
  ];
  return entries
    .map(([label, value]) => ({ label, value: (value ?? "").trim() }))
    .filter((e) => e.value.length > 0);
}

export default function BankTransferInfo() {
  const lines = bankTransferLines();

  return (
    <div className="border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
      <p className="font-bold">お振込先のご案内</p>
      <p className="mt-1">下記口座へお振込をお願いいたします。入金確認後、納付状況が「納付済」に更新されます。</p>
      {lines.length > 0 ? (
        <dl className="mt-2 space-y-1 bg-white px-3 py-2">
          {lines.map((l) => (
            <div key={l.label} className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-xs font-semibold text-gray-500">{l.label}</dt>
              <dd className="text-right text-sm font-semibold text-gray-800">{l.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 bg-white px-3 py-2 font-semibold">{BANK_TRANSFER_INFO}</p>
      )}
      <p className="mt-1 text-xs">※ 振込手数料はご負担ください。お名前は生徒ご本人の氏名でお願いします。</p>
    </div>
  );
}
