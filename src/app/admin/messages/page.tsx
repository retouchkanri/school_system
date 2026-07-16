import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Td, Badge, EmptyState, SectionTitle } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { BulkMessage } from "@/lib/types";
import MessageForm from "./message-form";

const BULK_AUDIENCE_LABELS: Record<string, string> = {
  students: "在校生のみ",
  parents: "保護者のみ",
  both: "在校生+保護者",
};

export default async function AdminMessagesPage() {
  await requireRole("admin");

  const { data } = await adminDb()
    .from("bulk_messages")
    .select("*")
    .order("sent_at", { ascending: false });
  const messages = (data ?? []) as BulkMessage[];

  return (
    <div>
      <PageHeader
        title="一斉メール・LINE"
        description="在校生・保護者へメールとLINEでメッセージを一斉送信します"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card title="✉️ 新規一斉送信">
            <MessageForm />
          </Card>
        </div>

        <div className="lg:col-span-3">
          <SectionTitle>送信履歴({messages.length}件)</SectionTitle>
          {messages.length === 0 ? (
            <EmptyState message="まだ一斉送信の履歴がありません。" />
          ) : (
            <Table headers={["送信日時", "対象", "件名", "送信数", "チャネル"]}>
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-xs text-gray-500">{fmtDateTime(m.sent_at)}</Td>
                  <Td>
                    <Badge tone={m.audience === "students" ? "green" : m.audience === "parents" ? "amber" : "brand"}>
                      {BULK_AUDIENCE_LABELS[m.audience] ?? m.audience}
                    </Badge>
                  </Td>
                  <Td>
                    <p className="text-sm font-semibold text-gray-800">{m.title}</p>
                    <p className="mt-0.5 max-w-md text-xs text-gray-500">
                      {m.body.length > 60 ? `${m.body.slice(0, 60)}…` : m.body}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-sm font-semibold text-gray-800">{m.recipient_count}件</Td>
                  <Td className="whitespace-nowrap text-sm">
                    {!m.via_email && !m.via_line ? "—" : (
                      <>
                        {m.via_email && <span title="メール">📧</span>}
                        {m.via_line && <span title="LINE"> 💬</span>}
                      </>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
