import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { queryJobs } from "@/lib/job-query";
import { jobFilterSchema, defaultFilters, pageUrl } from "@/lib/job-filters";
import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { RefreshMatches } from "@/components/job-actions";
import { Button } from "@/components/ui/button";
export async function JobList({
  params,
  savedOnly = false,
}: {
  params: Record<string, string | string[] | undefined>;
  savedOnly?: boolean;
}) {
  const parsed = jobFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : defaultFilters;
  const path = savedOnly ? "/saved" : "/discover";
  const result = await queryJobs(filters, savedOnly);
  const Icon = savedOnly ? Bookmark : Search;
  return (
    <section>
      <h2 className="mb-4">{savedOnly ? "Saved jobs" : "Imported jobs"}</h2>
      {!parsed.success && (
        <p role="alert" className="mb-4 text-sm text-danger">
          The filters are invalid. Default filters are shown; reset them or
          correct the values.
        </p>
      )}
      <JobFilters key={JSON.stringify(filters)} filters={filters} path={path} />
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-border bg-bg py-3">
        <p className="text-sm text-text-muted">
          {result.total} jobs match these filters.
          {result.truncated &&
            " Results are limited to the 1,000 most recent records before sorting and skill-score filtering."}
        </p>
        <RefreshMatches />
      </div>
      {result.entries.length ? (
        <div className="space-y-4">
          {result.entries.map((entry) => (
            <JobCard key={entry.job.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="panel empty-state">
          <Icon size={28} aria-hidden="true" className="text-text-muted" />
          <h2>
            {savedOnly
              ? "No saved jobs match these filters"
              : "No imported jobs match these filters"}
          </h2>
          <p>
            Import a job manually, or reset filters to see your available
            records.
          </p>
          <Button asChild variant="secondary">
            <Link href="/discover#import">Import a job</Link>
          </Button>
        </div>
      )}
      <nav
        aria-label="Job list pages"
        className="mt-4 flex items-center justify-between gap-3"
      >
        <span className="text-xs text-text-muted">
          Page {result.page} of {result.pages}
        </span>
        <div className="flex gap-2">
          {result.page > 1 && (
            <Button asChild variant="secondary">
              <Link href={pageUrl(path, filters, result.page - 1)}>
                Previous
              </Link>
            </Button>
          )}
          {result.page < result.pages && (
            <Button asChild variant="secondary">
              <Link href={pageUrl(path, filters, result.page + 1)}>Next</Link>
            </Button>
          )}
        </div>
      </nav>
    </section>
  );
}
