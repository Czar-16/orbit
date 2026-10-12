import { z } from "zod";
import { notFound } from "next/navigation";
import { requireWorkspace, databaseStatus } from "@/lib/db";
import { emptyProfile, profileFactsSchema } from "@/lib/profile-schema";
import { profileDefaults } from "@/lib/profile-input";
import { resumeReview } from "@/lib/resume-management";
import { proposeResumeFacts } from "@/lib/resume-proposal";
import { ProfileForm } from "@/components/profile-form";
import { Unavailable } from "@/components/unavailable";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { InputError } from "@/lib/action-result";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.object({ id: z.uuid() }).safeParse(await params);
  if (!parsed.success) notFound();
  const status = await databaseStatus();
  if (status.state !== "ready")
    return (
      <Unavailable
        title="Database unavailable"
        description={status.detail}
        phase="Local setup"
      />
    );
  const { database, workspaceId } = await requireWorkspace();
  const [profile, resumes] = await Promise.all([
    database.profileVersion.findFirst({
      where: { workspaceId },
      orderBy: { revision: "desc" },
    }),
    database.resumeVersion.findMany({
      where: { workspaceId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true },
    }),
  ]);
  const resume = resumes.find((r) => r.id === parsed.data.id);
  if (!resume) notFound();
  let text: string;
  try {
    text = await resumeReview(resume.id);
  } catch (e) {
    if (!(e instanceof InputError)) throw e;
    return (
      <Unavailable
        title="Resume extraction unavailable"
        description={e.message}
        phase="Manual profile entry"
      />
    );
  }
  const proposed = proposeResumeFacts(
    text,
    profile ? profileFactsSchema.parse(profile.facts) : emptyProfile(),
    resume.id,
  );
  return (
    <>
      <div className="page-heading">
        <h1>Review resume extraction</h1>
        <p>
          {resume.filename}. Nothing has been saved. Existing fields are
          preserved; missing email, skills and verbatim bullet candidates may be
          proposed.
        </p>
      </div>
      <section className="panel mb-4">
        <h2 className="mb-3">
          Extracted source text <ProvenanceBadge provenance="inferred" />
        </h2>
        <details>
          <summary className="min-h-11 cursor-pointer text-sm">
            Inspect original extracted text
          </summary>
          <pre className="max-w-[70ch] whitespace-pre-wrap break-words text-sm">
            {text}
          </pre>
        </details>
        <p className="text-sm text-warning">
          Check every proposal against your document. Bullet candidates may
          describe employment or other sections; keep only genuine project
          bullets in Projects. No legal, eligibility, demographic, Java or
          Spring Boot answer is proposed.
        </p>
      </section>
      <section className="panel">
        <h2 className="mb-4">Review all fields before explicit verification</h2>
        <ProfileForm
          defaults={profileDefaults(
            proposed,
            profile?.revision ?? 0,
            resume.id,
          )}
          facts={proposed}
          resumes={resumes}
        />
      </section>
    </>
  );
}
