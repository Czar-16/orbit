import type { Metadata } from "next";
import { getDatabase, databaseStatus, requireWorkspace } from "@/lib/db";
import { profileFactsSchema, emptyProfile } from "@/lib/profile-schema";
import { profileDefaults } from "@/lib/profile-input";
import { ProfileForm } from "@/components/profile-form";
import { ResumeUpload } from "@/components/resume-upload";
import { Unavailable } from "@/components/unavailable";
import { ProvenanceBadge } from "@/components/provenance-badge";
export const metadata: Metadata = { title: "Resume & profile" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const status = await databaseStatus();
  if (!getDatabase() || status.state !== "ready")
    return (
      <>
        <div className="page-heading">
          <h1>Resume & profile</h1>
          <p>Private documents and facts confirmed by you.</p>
        </div>
        <Unavailable
          title="Database setup is required"
          description={status.detail}
          phase="Local database setup"
        />
      </>
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
      select: { id: true, filename: true, byteSize: true, createdAt: true },
    }),
  ]);
  const facts = profile
    ? profileFactsSchema.parse(profile.facts)
    : emptyProfile();
  return (
    <>
      <div className="page-heading">
        <h1>Resume & profile</h1>
        <p>
          {profile
            ? `Profile revision ${profile.revision}. Changes create a new revision.`
            : "No profile facts have been confirmed yet. Needs your input."}
        </p>
      </div>
      <div className="panel mb-4">
        <h2 className="mb-4">Resume documents</h2>
        <ResumeUpload />
        {resumes.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words">{resume.filename}</p>
                  <p className="text-xs text-text-muted">
                    {Math.ceil(resume.byteSize / 1024)} KB ·{" "}
                    {new Intl.DateTimeFormat("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(resume.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ProvenanceBadge provenance="user-provided" />
                  <a
                    href={`/api/resumes/${resume.id}`}
                    download
                    className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface-2 px-3 text-sm"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            No resume uploaded. Upload a private document to keep a versioned
            reference.
          </p>
        )}
      </div>
      <section className="panel">
        <h2 className="mb-2">Your verified profile</h2>
        <p className="mb-4 max-w-[70ch] text-sm text-text-muted">
          Enter only facts you can confirm. Uploading a document does not add
          skills or experience to this form. Unknown fields remain unknown; no
          Java or Spring Boot experience is assumed.
        </p>
        <ProfileForm
          defaults={profileDefaults(
            facts,
            profile?.revision,
            profile?.resumeVersionId ?? "",
          )}
          facts={facts}
          resumes={resumes}
        />
      </section>
    </>
  );
}
