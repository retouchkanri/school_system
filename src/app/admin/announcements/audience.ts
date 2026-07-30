import { adminDb } from "@/lib/supabase/admin";
import {
  summarizeAudience,
  type AudienceStat,
  type RawRecipient,
  type ResolvedAudience,
} from "@/app/admin/messages/audience";
import type { AudienceType } from "@/lib/types";

/**
 * お知らせ配信の宛先解決 (サーバー専用)。
 * 宛先プレビュー (page.tsx) と実際の配信 (actions.ts) で必ず同じ結果になるよう、
 * 両者ともこのモジュールを経由する。
 */

interface AnnouncementProfile {
  id: string;
  role: string;
  email: string | null;
  line_id: string | null;
}

interface AnnouncementLead {
  id: string;
  email: string | null;
  line_id: string | null;
}

export interface AnnouncementDirectory {
  /** 全ロールのアカウント */
  profiles: AnnouncementProfile[];
  /** 入学決定者 = 合格通知済みのリード (profiles を持たない場合がある) */
  enrolleeLeads: AnnouncementLead[];
}

export async function loadAnnouncementDirectory(): Promise<AnnouncementDirectory> {
  const db = adminDb();
  const [profileRes, decisionRes] = await Promise.all([
    db.from("profiles").select("id, role, email, line_id"),
    db.from("admission_decisions").select("lead_id, leads(email, line_id)").eq("result", "accepted"),
  ]);

  const rows = (decisionRes.data ?? []) as unknown as {
    lead_id: string;
    leads: { email: string | null; line_id: string | null } | null;
  }[];
  const enrolleeLeads: AnnouncementLead[] = rows
    .filter((r) => r.leads !== null)
    .map((r) => ({ id: r.lead_id, email: r.leads?.email ?? null, line_id: r.leads?.line_id ?? null }));

  return { profiles: (profileRes.data ?? []) as AnnouncementProfile[], enrolleeLeads };
}

const profileRaw = (p: AnnouncementProfile): RawRecipient => ({
  key: `profile:${p.id}`,
  email: p.email,
  line_id: p.line_id,
});

const leadRaw = (l: AnnouncementLead): RawRecipient => ({
  key: `lead:${l.id}`,
  email: l.email,
  line_id: l.line_id,
});

/**
 * 配信対象ごとの宛先候補。
 * audience='all' は「全体」向けお知らせであり、入学決定者のマイページにも表示される。
 * そのため profiles だけでなく合格済みリードも宛先に含める
 * (同一メールアドレスの重複は summarizeAudience 側で排除される)。
 */
export function collectAnnouncementRaw(dir: AnnouncementDirectory, audience: AudienceType): RawRecipient[] {
  if (audience === "enrollee") return dir.enrolleeLeads.map(leadRaw);
  if (audience === "all") return [...dir.profiles.map(profileRaw), ...dir.enrolleeLeads.map(leadRaw)];
  // student / parent / supporter は同名のロールを持つアカウントのみ
  return dir.profiles.filter((p) => p.role === audience).map(profileRaw);
}

export function resolveAnnouncementAudience(dir: AnnouncementDirectory, audience: AudienceType): ResolvedAudience {
  return summarizeAudience(collectAnnouncementRaw(dir, audience));
}

export const ANNOUNCEMENT_AUDIENCES: AudienceType[] = ["enrollee", "student", "parent", "supporter", "all"];

export type AnnouncementStats = Record<AudienceType, AudienceStat>;

/** 配信フォームの宛先プレビュー用に、配信対象ごとの件数を事前集計する */
export function buildAnnouncementStats(dir: AnnouncementDirectory): AnnouncementStats {
  return ANNOUNCEMENT_AUDIENCES.reduce((acc, audience) => {
    acc[audience] = resolveAnnouncementAudience(dir, audience).stat;
    return acc;
  }, {} as AnnouncementStats);
}
