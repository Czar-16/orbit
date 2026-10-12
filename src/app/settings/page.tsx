import Link from "next/link";
import { exportEntities } from "@/lib/data-export";
import type { Metadata } from "next";
import { validateEnvironment } from "@/lib/env";
import { databaseStatus, requireWorkspace } from "@/lib/db";
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
  const env = validateEnvironment(process.env);
  const logs =
    status.state === "ready"
      ? await (async () => {
          const { database, workspaceId } = await requireWorkspace();
          return database.outboundDataLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: "desc" },
            take: 100,
          });
        })()
      : [];
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
              value: "Off by default",
              detail:
                "No key is required for preparation. Optional OpenAI/Ollama adapters select existing verified content only; neither is claimed as connected until tested.",
            },
            {
              icon: Clock3,
              label: "Daily activity timezone",
              value: "Asia/Kolkata",
              detail:
                "Daily limits and follow-up dates use this timezone; timestamps are stored in UTC.",
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
        <h2 className="mb-4">AI configuration and outbound data log</h2>
        <p className="text-sm text-text-muted">
          Deterministic mode is always available. OpenAI:{" "}
          {env.OPENAI_API_KEY &&
          env.OPENAI_MODEL &&
          env.ORBIT_ALLOW_PAID_AI === "true"
            ? "Configured, real interface untested"
            : "Not configured / spending disabled"}
          . Ollama:{" "}
          {env.OLLAMA_MODEL
            ? "Configured, real interface untested"
            : "Not configured"}
          . See .env.example. Provider choice is per regeneration; no automatic
          calls.
        </p>
        <p className="field-hint">
          Most recent 100 attempts. Logs record field names, never secrets or
          raw personal data. Attempted means no completion result was recorded.
        </p>
        {logs.length ? (
          <ul className="mt-4 divide-y divide-border">
            {logs.map((l) => (
              <li className="break-words py-3 text-sm" key={l.id}>
                {l.provider} · {l.feature} · {l.model} · {l.result}
                <p className="text-xs text-text-muted">
                  {l.createdAt.toISOString()} · Fields: {l.fields.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm">No provider requests recorded.</p>
        )}
      </section>
      <section id="data-export" className="panel mt-4">
        <h2>Export and backup</h2>
        <p className="mt-2 text-sm text-text-muted">
          Exports contain private profile facts, answers and history. Store them
          privately. Original resume bytes and internal storage paths are
          excluded; download resumes separately from Profile. No restore is
          performed by export.
        </p>
        <Link
          href="/api/export?format=json"
          className="inline-flex min-h-11 items-center underline"
        >
          Download all data as JSON
        </Link>
        <h3 className="mt-4 text-sm">
          CSV tables (nested values are JSON cells)
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4">
          {exportEntities.map((entity) => (
            <Link
              key={entity}
              href={`/api/export?format=csv&entity=${entity}`}
              className="inline-flex min-h-11 items-center underline text-sm"
            >
              {entity}
            </Link>
          ))}
        </div>
        <p className="field-hint">
          Full database and private-resume backup instructions: docs/BACKUP.md
          in the project. Empty CSV tables contain no data rows.
        </p>
      </section>
      {preferences && (
        <section className="panel mt-4">
          <h2 className="mb-4">Matching preferences</h2>
          {preferences.version?.origin === "defaults" && (
            <p className="mb-4 text-sm text-text-muted">
              Default values snapshotted for draft history. Save this form to
              record your own preference choices.
            </p>
          )}
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
