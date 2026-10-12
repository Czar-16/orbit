import type { Metadata } from "next";
import { Monitor, Database, KeyRound, Clock3 } from "lucide-react";
export const metadata: Metadata = { title: "Settings" };
export default function Settings() {
  return (
    <>
      <div className="page-heading">
        <h1>Settings</h1>
        <p>Current setup and availability.</p>
      </div>
      <section className="panel">
        <h2 className="mb-4">Workspace configuration</h2>
        <dl className="settings-list">
          {[
            {
              icon: Monitor,
              label: "Workspace mode",
              value: "Local only",
              detail:
                "Development and production start scripts bind to 127.0.0.1.",
            },
            {
              icon: Database,
              label: "Database",
              value: "Not configured",
              detail:
                "Phase 2 starts with a database model proposal for your approval.",
            },
            {
              icon: KeyRound,
              label: "AI assistance",
              value: "Not connected",
              detail:
                "No AI key is required for this shell. Deterministic matching is planned for a later phase.",
            },
            {
              icon: Clock3,
              label: "Daily activity timezone",
              value: "Asia/Kolkata",
              detail:
                "Future daily limits and follow-up dates use this timezone; timestamps will be stored in UTC.",
            },
          ].map((item) => (
            <div key={item.label}>
              <dt>
                <item.icon size={18} aria-hidden="true" />
                {item.label}
              </dt>
              <dd>
                <span>{item.value}</span>
                <p>{item.detail}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel mt-4">
        <h2>Source availability</h2>
        <p className="mt-2 text-sm text-text-muted">
          No external sources or submission integrations are enabled. Source
          terms must be reviewed and recorded before enabling a supported public
          API or feed.
        </p>
      </section>
    </>
  );
}
