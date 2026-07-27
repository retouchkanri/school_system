import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { downloadApplicationDocument, isApplicationDocumentFile } from "@/lib/documents";
import { APPLICATION_FILE_DOCUMENTS } from "@/lib/constants";
import type { Application, Lead } from "@/lib/types";

type ApplicationWithLead = Application & { leads: Pick<Lead, "name"> | null };

/** 出願書類 (アップロードされたファイル + 作文) を1つのZIPにまとめてダウンロードする (管理者専用) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const { data } = await adminDb()
    .from("applications")
    .select("*, leads(name)")
    .eq("id", id)
    .maybeSingle();
  const application = data as ApplicationWithLead | null;
  if (!application) return NextResponse.json({ error: "出願が見つかりません" }, { status: 404 });

  const zip = new JSZip();
  for (const doc of APPLICATION_FILE_DOCUMENTS) {
    const file = application.documents[doc.key];
    if (!isApplicationDocumentFile(file)) continue;
    const buffer = await downloadApplicationDocument(file.path);
    if (!buffer) continue;
    const ext = file.path.split(".").pop() ?? "bin";
    zip.file(`${doc.label}.${ext}`, buffer);
  }
  if (application.essay?.trim()) {
    zip.file("作文.txt", application.essay);
  }

  if (Object.keys(zip.files).length === 0) {
    return NextResponse.json({ error: "提出された書類がありません" }, { status: 404 });
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const applicantName = application.leads?.name ?? "applicant";
  const utf8Name = encodeURIComponent(`${applicantName}_出願書類.zip`);

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="application-documents.zip"; filename*=UTF-8''${utf8Name}`,
      "Content-Length": String(zipBuffer.byteLength),
    },
  });
}
