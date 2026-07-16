import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Td, Badge, EmptyState, SectionTitle, type BadgeTone } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { Announcement } from "@/lib/types";
import AnnouncementForm from "./announcement-form";

const AUDIENCE_TONES: Record<Announcement["audience"], BadgeTone> = {
  enrollee: "blue",
  student: "green",
  parent: "amber",
  supporter: "purple",
  all: "brand",
};

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");

  const { data } = await adminDb()
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false });
  const announcements = (data ?? []) as Announcement[];

  return (
    <div>
      <PageHeader
        title="お知らせ配信"
        description="入学決定者・在校生・保護者・一口支援者へのお知らせを作成し、メール・LINEで一斉配信します"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card title="📣 新規お知らせ作成">
            <AnnouncementForm />
          </Card>
        </div>

        <div className="lg:col-span-3">
          <SectionTitle>配信履歴({announcements.length}件)</SectionTitle>
          {announcements.length === 0 ? (
            <EmptyState message="まだお知らせの配信履歴がありません。" />
          ) : (
            <Table headers={["配信日時", "対象", "タイトル・本文", "チャネル"]}>
              {announcements.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-xs text-gray-500">{fmtDateTime(a.published_at)}</Td>
                  <Td>
                    <Badge tone={AUDIENCE_TONES[a.audience]}>{AUDIENCE_LABELS[a.audience]}</Badge>
                  </Td>
                  <Td>
                    <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                    <p className="mt-0.5 max-w-md text-xs text-gray-500">
                      {a.body.length > 80 ? `${a.body.slice(0, 80)}…` : a.body}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-sm">
                    {!a.send_email && !a.send_line ? "—" : (
                      <>
                        {a.send_email && <span title="メール">📧</span>}
                        {a.send_line && <span title="LINE"> 💬</span>}
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
