import Link from "next/link";
import type { JobFilters as Filters } from "@/lib/job-filters";
import { Button } from "@/components/ui/button";
export function JobFilters({
  filters,
  path,
}: {
  filters: Filters;
  path: string;
}) {
  return (
    <form method="get" action={path} className="panel mb-4">
      <h2 className="mb-4">Filter jobs</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "role", label: "Role" },
          { key: "company", label: "Company" },
          { key: "location", label: "Location" },
          { key: "source", label: "Source" },
          { key: "minScore", label: "Minimum skills score" },
          { key: "maxScore", label: "Maximum skills score" },
          { key: "from", label: "Discovered from" },
          { key: "to", label: "Discovered through" },
        ].map((field) => (
          <div key={field.key}>
            <label className="field-label" htmlFor={`filter-${field.key}`}>
              {field.label}
            </label>
            <input
              id={`filter-${field.key}`}
              name={field.key}
              className="field-input"
              type={
                field.key === "from" || field.key === "to"
                  ? "date"
                  : field.key.includes("Score")
                    ? "number"
                    : "text"
              }
              min={field.key.includes("Score") ? 0 : undefined}
              max={field.key.includes("Score") ? 100 : undefined}
              defaultValue={filters[field.key as keyof Filters]}
            />
          </div>
        ))}
        <div>
          <label className="field-label" htmlFor="filter-status">
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={filters.status}
            className="field-input"
          >
            {["active", "all", "saved", "dismissed", "archived"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="filter-sort">
            Sort
          </label>
          <select
            id="filter-sort"
            name="sort"
            defaultValue={filters.sort}
            className="field-input"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score">Skills score</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary">Apply filters</Button>
        <Button asChild variant="ghost">
          <Link href={path}>Reset filters</Link>
        </Button>
      </div>
      <p className="field-hint">
        Dates use Asia/Kolkata. Unknown scores do not satisfy a score range.
      </p>
    </form>
  );
}
