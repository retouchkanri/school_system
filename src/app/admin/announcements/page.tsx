import { Mail, MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { PageHeader, Card, Table, Td, Badge, EmptyState, SectionTitle, type BadgeTone } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { Announcement } from "@/lib/types";
import AnnouncementForm from "./announcement-form";
import { buildAnnouncementStats, loadAnnouncementDirectory } from "./audience";

const AUDIENCE_TONES: Record<Announcement["audience"], BadgeTone> = {
  enrollee: "blue",
  student: "green",
  parent: "amber",
  supporter: "purple",
  all: "brand",
};

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");

  const [{ data }, dir] = await Promise.all([
    adminDb().from("announcements").select("*").order("published_at", { ascending: false }),
    loadAnnouncementDirectory(),
  ]);
  const announcements = (data ?? []) as Announcement[];
  const stats = buildAnnouncementStats(dir);

  return (
    <div>
      <PageHeader
        title="お知らせ配信"
        description="入学決定者・在校生・保護者・一口支援者へのお知らせを作成し、メール・LINEで一斉配信します"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card title="新規お知らせ作成">
            <AnnouncementForm stats={stats} />
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
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        {a.send_email && <Mail className="h-3.5 w-3.5" aria-label="メール" />}
                        {a.send_line && <MessageCircle className="h-3.5 w-3.5" aria-label="LINE" />}
                      </span>
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
