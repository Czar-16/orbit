import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { Unavailable } from "@/components/unavailable";
import { JobList } from "@/components/job-list";
export const metadata: Metadata = { title: "Saved jobs" };
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
        <h1>Saved jobs</h1>
        <p>Jobs you saved for later. Saving never submits an application.</p>
      </div>
      {status.state !== "ready" ? (
        <Unavailable
          title="Database setup is required"
          description={status.detail}
          phase="Local database setup"
        />
      ) : (
        <JobList params={await searchParams} savedOnly />
      )}
    </>
  );
}
