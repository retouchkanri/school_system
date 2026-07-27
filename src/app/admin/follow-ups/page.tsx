import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { FOLLOW_UP_RULES } from "@/lib/constants";
import { findFollowUpTargets, getFollowUpSettings } from "@/lib/follow-ups";
import { fmtDateTime } from "@/lib/format";
import {
  PageHeader,
  Card,
  Table,
  Td,
  Badge,
  LeadStatusBadge,
  EmptyState,
  btnSmall,
  btnPrimary,
  btnSecondary,
  inputCls,
} from "@/components/ui";
import {
  sendFollowUpAction,
  sendFollowUpBulkAction,
  saveFollowUpSettingAction,
  runAutoFollowUpsNowAction,
} from "./actions";

export default async function AdminFollowUpsPage() {
  await requireRole("admin");
  const [targets, settings] = await Promise.all([findFollowUpTargets(), getFollowUpSettings()]);

  const autoOnCount = FOLLOW_UP_RULES.filter((r) => settings[r.key].auto_enabled).length;
  const lastRunAt = FOLLOW_UP_RULES.map((r) => settings[r.key].last_run_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const cronConfigured = !!process.env.CRON_SECRET;

  return (
    <div>
      <PageHeader
        title="フォロー対象"
        description="条件に該当する見込み客を自動抽出し、リマインドのメール/LINEを送信します"
        action={
          <form action={runAutoFollowUpsNowAction}>
            <button type="submit" className={btnSecondary}>
              ⚡ 自動送信を今すぐ実行
            </button>
          </form>
        }
      />

      <div className="mb-6 border border-brand-200 bg-brand-50/60 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-bold text-brand-700">自動送信</span>
          <span className="text-gray-700">
            有効なルール: <span className="font-bold">{autoOnCount}</span> / {FOLLOW_UP_RULES.length}
          </span>
          <span className="text-gray-700">最終実行: {lastRunAt ? fmtDateTime(lastRunAt) : "未実行"}</span>
          <Badge tone={cronConfigured ? "green" : "amber"}>
            {cronConfigured ? "定期実行 設定済 (毎日10:00)" : "定期実行 未設定"}
          </Badge>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          自動送信をONにしたルールは、条件成立から「待機日数」が経過した未送信の見込み客へ毎日自動でフォロー通知を送ります。
          同じ方へ同じルールで二重に送ることはありません。
          {!cronConfigured && (
            <>
              <br />
              ※ 定期実行には環境変数 <code className="font-mono">CRON_SECRET</code> の設定が必要です。未設定の間は上の「今すぐ実行」ボタンからの手動実行のみ動作します。
            </>
          )}
        </p>
      </div>

      <div className="space-y-6">
        {FOLLOW_UP_RULES.map((rule) => {
          const rows = targets[rule.key] ?? [];
          const setting = settings[rule.key];
          const unsent = rows.filter((r) => !r.sent);
          const autoQueued = unsent.filter((r) => r.days >= setting.min_days && (r.lead.email || r.lead.line_id));

          return (
            <Card
              key={rule.key}
              title={`${rule.label} (${rows.length}件)`}
              action={
                unsent.length > 0 ? (
                  <form action={sendFollowUpBulkAction}>
                    <input type="hidden" name="rule" value={rule.key} />
                    <input type="hidden" name="lead_ids" value={unsent.map((r) => r.lead.id).join(",")} />
                    <button type="submit" className={btnPrimary}>
                      ✉️ 未送信の{unsent.length}件へ一括送信
                    </button>
                  </form>
                ) : rows.length > 0 ? (
                  <Badge tone="green">全件送信済</Badge>
                ) : undefined
              }
            >
              <p className="mb-3 text-xs text-gray-400">{rule.description}</p>

              <form
                action={saveFollowUpSettingAction}
                className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-gray-200 bg-gray-50 px-3 py-2.5"
              >
                <input type="hidden" name="rule" value={rule.key} />
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    name="auto_enabled"
                    defaultChecked={setting.auto_enabled}
                    className="accent-brand-600"
                  />
                  このルールを自動送信する
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  待機日数
                  <input
                    type="number"
                    name="min_days"
                    min={0}
                    max={365}
                    defaultValue={setting.min_days}
                    className={`${inputCls} w-20`}
                  />
                  日以上
                </label>
                <button type="submit" className={btnSmall}>
                  設定を保存
                </button>
                <span className="text-xs text-gray-500">
                  {setting.auto_enabled ? (
                    <>
                      次回の自動送信対象: <span className="font-bold text-brand-700">{autoQueued.length}件</span>
                      {setting.last_run_at && ` / 最終実行 ${fmtDateTime(setting.last_run_at)} (${setting.last_sent_count}件送信)`}
                    </>
                  ) : (
                    "自動送信は停止中です (手動送信のみ)"
                  )}
                </span>
              </form>

              {rows.length === 0 ? (
                <EmptyState message="該当するリードはいません" />
              ) : (
                <Table headers={["氏名", "ステータス", rule.elapsedLabel, "連絡先", "フォロー"]}>
                  {rows.map(({ lead, days, sent }) => {
                    const queued = !sent && setting.auto_enabled && days >= setting.min_days && (lead.email || lead.line_id);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <Td>
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            {lead.name}
                          </Link>
                          {lead.kana && <p className="text-[11px] text-gray-400">{lead.kana}</p>}
                        </Td>
                        <Td>
                          <LeadStatusBadge status={lead.status} />
                        </Td>
                        <Td>
                          <span className={`font-semibold ${days >= 14 ? "text-red-600" : "text-gray-700"}`}>
                            {days}日
                          </span>
                        </Td>
                        <Td>
                          <p className="text-xs text-gray-600">{lead.email ?? "メールなし"}</p>
                          <p className="text-[11px] text-gray-400">
                            {lead.line_id ? `LINE: ${lead.line_id}` : "LINEなし"}
                          </p>
                        </Td>
                        <Td>
                          {sent ? (
                            <Badge tone="green">送信済 ✓</Badge>
                          ) : !lead.email && !lead.line_id ? (
                            <Badge tone="gray">連絡先なし</Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <form action={sendFollowUpAction}>
                                <input type="hidden" name="lead_id" value={lead.id} />
                                <input type="hidden" name="rule" value={rule.key} />
                                <button type="submit" className={btnSmall}>
                                  ✉️ フォロー送信
                                </button>
                              </form>
                              {queued && <Badge tone="blue">自動送信待ち</Badge>}
                            </div>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
