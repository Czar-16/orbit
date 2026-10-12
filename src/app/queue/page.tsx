import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { databaseStatus, requireWorkspace } from "@/lib/db";
import { Unavailable } from "@/components/unavailable";
export const metadata: Metadata = { title: "Application queue" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const status = await databaseStatus();
  if (status.state !== "ready")
    return (
      <Unavailable
        title="Database unavailable"
        description={status.detail}
        phase="Local database setup"
      />
    );
  const { database, workspaceId } = await requireWorkspace();
  const drafts = await database.applicationDraft.findMany({
    where: { workspaceId },
    orderBy: [{ jobId: "asc" }, { revision: "desc" }],
    distinct: ["jobId"],
    include: { jobRevision: true },
    take: 200,
  });
  return (
    <>
      <div className="page-heading">
        <h1>Application queue</h1>
        <p>
          Review saved materials. Nothing has been submitted. You submit on the
          employer&apos;s site yourself.
        </p>
      </div>
      <section className="panel">
        <h2 className="mb-4">Latest drafts</h2>
        {drafts.length ? (
          <ul className="divide-y divide-border">
            {drafts.map((d) => (
              <li className="py-3" key={d.id}>
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/queue/${d.id}`}
                >
                  {d.jobRevision.title ?? "Role needs your input"} ·{" "}
                  {d.jobRevision.company ?? "Company unknown"}
                </Link>
                <p className="text-sm text-text-muted">
                  Revision {d.revision} ·{" "}
                  {d.operation === "discard"
                    ? "Discarded"
                    : "Draft ready for review"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <FileText
              size={28}
              className="text-text-muted"
              aria-hidden="true"
            />
            <p>
              No drafts yet. Choose a job and prepare an application to review
              it here.
            </p>
            <Button asChild variant="secondary">
              <Link href="/discover">Find a job</Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
