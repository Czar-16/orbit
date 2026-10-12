import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { Unavailable } from "@/components/unavailable";
import { JobImportForm } from "@/components/job-import-form";
import { JobFileImport } from "@/components/job-file-import";
import { discoveryState } from "@/lib/discovery-service";
import { DiscoveryControls } from "@/components/discovery-controls";
import { JobList } from "@/components/job-list";
import { ProcessingSummary } from "@/components/processing-summary";
export const metadata: Metadata = { title: "Discover jobs" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = await databaseStatus();
  const discovery = status.state === "ready" ? await discoveryState() : null;
  return (
    <>
      <div className="page-heading">
        <h1>Discover jobs</h1>
        <p>
          Permitted public APIs and manual intake. Listing pages are never
          fetched.
        </p>
      </div>
      {status.state !== "ready" ? (
        <Unavailable
          title="Database setup is required"
          description={status.detail}
          phase="Local database setup"
        />
      ) : (
        <>
          <ProcessingSummary />
          {discovery && (
            <DiscoveryControls
              sources={discovery.sources}
              processed={discovery.processed}
              limit={discovery.preferences.dailyLimit}
            />
          )}
          <section id="import" className="panel mb-4 scroll-mt-4">
            <h2 className="mb-4">Import a job</h2>
            <JobImportForm />
          </section>
          <section className="panel mb-6">
            <h2 className="mb-4">Import a file</h2>
            <JobFileImport />
          </section>
          <JobList params={{ sort: "score", ...(await searchParams) }} />
        </>
      )}
    </>
  );
}
