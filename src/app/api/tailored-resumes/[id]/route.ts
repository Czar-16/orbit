import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { localExportRequest } from "@/lib/export-format";
import { checkedArtifacts } from "@/lib/tailored-artifacts";
import {
  createInspectionReceipt,
  inspectionCookie,
} from "@/lib/resume-inspection";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!localExportRequest(request))
    return new Response("Local same-origin access only", { status: 403 });
  const url = new URL(request.url);
  const parsed = z
    .object({
      id: z.uuid(),
      format: z.enum(["PDF", "DOCX"]),
      preview: z.enum(["0", "1"]),
    })
    .safeParse({
      ...(await params),
      format: url.searchParams.get("format") ?? "PDF",
      preview: url.searchParams.get("preview") ?? "0",
    });
  if (
    !parsed.success ||
    (parsed.data.preview === "1" && parsed.data.format !== "PDF")
  )
    return new Response("Document not found", { status: 404 });
  try {
    const { database, workspaceId } = await requireWorkspace();
    const exists = await database.tailoredResumeVersion.findFirst({
      where: { workspaceId, id: parsed.data.id },
      select: { id: true },
    });
    if (!exists) return new Response("Document not found", { status: 404 });
    const preview = parsed.data.preview === "1";
    const { version, files } = await checkedArtifacts(
      database,
      workspaceId,
      parsed.data.id,
      !preview,
    );
    const [profile, preference, job, source, resume, latest] =
      await Promise.all([
        database.profileVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
        database.preferenceVersion.findFirst({
          where: { workspaceId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
        database.job.findFirst({
          where: { workspaceId, id: version.jobId },
          include: { latestRevision: true },
        }),
        database.resumeContentVersion.findFirst({
          where: { workspaceId, resumeVersionId: version.resumeVersionId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
        database.resumeVersion.findFirst({
          where: { workspaceId, id: version.resumeVersionId },
          select: { revokedAt: true },
        }),
        database.tailoredResumeVersion.findFirst({
          where: { workspaceId, jobId: version.jobId },
          orderBy: { revision: "desc" },
          select: { id: true },
        }),
      ]);
    const stale =
      profile?.id !== version.profileVersionId ||
      preference?.id !== version.preferenceVersionId ||
      job?.latestRevision?.id !== version.jobRevisionId ||
      source?.id !== version.resumeContentVersionId ||
      !!resume?.revokedAt ||
      latest?.id !== version.id;
    const format = parsed.data.format;
    const headers: Record<string, string> = {
      "Content-Type":
        format === "PDF"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="tailored-resume-r${version.revision}.${format.toLowerCase()}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Orbit-Version-Stale": String(stale),
    };
    if (preview) {
      const artifact = version.artifacts.find((a) => a.format === "PDF");
      if (!artifact) throw new Error("Missing PDF");
      headers["Set-Cookie"] =
        `${inspectionCookie(version.id)}=${createInspectionReceipt(version.id, artifact.sha256)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${url.protocol === "https:" ? "; Secure" : ""}`;
    }
    return new Response(new Uint8Array(files[format]), { headers });
  } catch {
    return new Response(
      "Document unavailable, unapproved, or checksum/validation failed. Review the resume and generate a new version if needed.",
      { status: 409, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
