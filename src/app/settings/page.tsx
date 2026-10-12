import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { discoveryState } from "@/lib/discovery-service";
import { DiscoveryControls } from "@/components/discovery-controls";
import { getPreferences } from "@/lib/preference-service";
import { PreferenceForm } from "@/components/preference-form";
import { Monitor, Database, KeyRound, Clock3 } from "lucide-react";
export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";
export default async function Settings() {
  const status = await databaseStatus();
  const discovery = status.state === "ready" ? await discoveryState() : null;
  const preferences = status.state === "ready" ? await getPreferences() : null;
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
              value: status.label,
              detail: status.detail,
            },
            {
              icon: KeyRound,
              label: "AI assistance",
              value: "Not connected",
              detail:
                "No AI key is required. Deterministic matching compares confirmed profile skills with manually supplied requirements.",
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
      {preferences && (
        <section className="panel mt-4">
          <h2 className="mb-4">Matching preferences</h2>
          <PreferenceForm
            key={preferences.version?.id ?? "defaults"}
            values={preferences.values}
            revision={preferences.version?.revision ?? 0}
          />
        </section>
      )}
      {discovery && (
        <div className="mt-4">
          <DiscoveryControls
            settings
            sources={discovery.sources}
            processed={discovery.processed}
            limit={discovery.preferences.dailyLimit}
          />
        </div>
      )}
    </>
  );
}
