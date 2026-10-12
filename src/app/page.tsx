import Link from "next/link";
import { ArrowRight, ShieldCheck, Database } from "lucide-react";
import { Unavailable } from "@/components/unavailable";
export default function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <h1>Dashboard</h1>
        <p>Your application workspace, at a glance.</p>
      </div>
      <div className="setup-banner">
        <Database size={20} aria-hidden="true" />
        <div>
          <h2>Database setup is pending</h2>
          <p>
            Phase 1 provides navigation and layout. Metrics become available
            after the database and their workflows are enabled.
          </p>
        </div>
        <Link href="/settings" className="text-sm underline underline-offset-4">
          Setup status
        </Link>
      </div>
      <section aria-label="Dashboard metrics" className="metrics">
        {[
          "Jobs discovered today",
          "Applications prepared",
          "Applications confirmed",
          "Follow-ups due today",
        ].map((label) => (
          <article className="panel metric" key={label}>
            <h2>{label}</h2>
            <p className="metric-value">Unavailable</p>
            <p className="text-xs text-text-muted">
              Requires database setup and an enabled workflow.
            </p>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <Unavailable
          title="Activity is unavailable"
          description="Job processing history and application status will appear here when real records are available."
          phase="Database & workflows"
        />
        <section className="panel">
          <h2 className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            You stay in control
          </h2>
          <div className="space-y-4 text-sm text-text-muted">
            <p>
              LinkedIn and Indeed jobs are added manually, by pasting a link or
              description.
            </p>
            <p>
              Preparing an application never submits it. Applications are marked
              applied only after your confirmation or a trustworthy authorized
              integration result.
            </p>
            <p>
              Daily activity uses Asia/Kolkata. No activity totals are available
              yet.
            </p>
          </div>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
            href="/discover"
          >
            Explore job intake
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </>
  );
}
