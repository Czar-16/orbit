import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { Unavailable } from "@/components/unavailable";
import { JobImportForm } from "@/components/job-import-form";
import { JobFileImport } from "@/components/job-file-import";
import { JobList } from "@/components/job-list";
export const metadata: Metadata = { title: "Discover jobs" };
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = await databaseStatus();
  return (
    <>
      <div className="page-heading">
        <h1>Discover jobs</h1>
        <p>
          Manual intake from links, descriptions, or files. No listing pages are
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
          <section id="import" className="panel mb-4 scroll-mt-4">
            <h2 className="mb-4">Import a job</h2>
            <JobImportForm />
          </section>
          <section className="panel mb-6">
            <h2 className="mb-4">Import a file</h2>
            <JobFileImport />
          </section>
          <JobList params={await searchParams} />
        </>
      )}
    </>
  );
}
