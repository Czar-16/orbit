import { z } from "zod";
import { requireWorkspace } from "@/lib/db";
import { readResume } from "@/lib/resume-storage";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const host = request.headers.get("host") ?? "";
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))
    return new Response("Local access only", { status: 403 });
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) return new Response("Resume not found", { status: 404 });
  try {
    const { database, workspaceId } = await requireWorkspace();
    const resume = await database.resumeVersion.findFirst({
      where: { workspaceId, id: parsed.data.id, revokedAt: null },
    });
    if (!resume) return new Response("Resume not found", { status: 404 });
    const contents = await readResume(resume.storageKey);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Disposition": `attachment; filename="${resume.filename.replace(/[^A-Za-z0-9 _.-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(
      "Resume could not be read. Check local storage and database setup.",
      { status: 503 },
    );
  }
}
