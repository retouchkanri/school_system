import { adminDb } from "@/lib/supabase/admin";
import { statusIndex } from "@/lib/constants";
import type { Lead, LeadStatus, Student } from "@/lib/types";

/** ログインユーザーに紐づくリード(入学希望者)を取得 */
export async function getLeadForUser(userId: string): Promise<Lead | null> {
  const { data } = await adminDb()
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Lead) ?? null;
}

/** ログインユーザー(在校生)の生徒レコードを取得 */
export async function getStudentForUser(userId: string): Promise<Student | null> {
  const { data } = await adminDb()
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data as Student) ?? null;
}

/** 保護者ユーザーに紐づく子(生徒)レコードを取得 */
export async function getStudentsForParent(userId: string): Promise<Student[]> {
  const { data } = await adminDb().from("students").select("*").eq("parent_user_id", userId);
  return (data as Student[]) ?? [];
}

/** ステータスを前進のみ許可で更新 (後退させない) */
export async function advanceLeadStatus(leadId: string, next: LeadStatus) {
  const { data } = await adminDb().from("leads").select("status").eq("id", leadId).single();
  if (!data) return;
  if (statusIndex(next) > statusIndex(data.status as LeadStatus)) {
    await adminDb()
      .from("leads")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", leadId);
  }
}
