"use client";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  runDiscoveryAction,
  runDailyAction,
  sourceControlAction,
} from "@/app/discover/discovery-actions";
import { type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
export function DiscoveryControls({
  sources,
  processed,
  limit,
  settings = false,
}: {
  sources: {
    id: string;
    label: string;
    enabled: boolean;
    companyQuery: string | null;
    runs: {
      state: string;
      error: string | null;
      startedAt: Date;
      imported: number;
    }[];
  }[];
  processed: number;
  limit: number;
  settings?: boolean;
}) {
  const { pending, active, begin, finish } = usePendingAction();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  async function act(operation: () => Promise<ActionResult>, key: string) {
    if (!begin(key)) return;
    setResult(null);
    try {
      const response = await operation();
      setResult(response);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: "Request failed. Try again." });
    } finally {
      finish();
    }
  }
  return (
    <section className="panel mb-4">
      <h2 className="mb-3">Permitted discovery sources</h2>
      <p className="mb-3 text-sm text-text-muted">
        {processed}/{limit} new relevant jobs processed today (Asia/Kolkata).
        Each query runs at most once per day; provider quota four requests/day,
        with at least 31 seconds between requests. Listing pages are never
        fetched. Daily scheduling uses the local Inngest server; manual
        discovery uses the same limits when that server is unavailable.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          loading={active === "daily"}
          onClick={() => act(runDailyAction, "daily")}
        >
          {active === "daily" ? "Requesting…" : "Run now"}
        </Button>
        <Button
          variant="secondary"
          disabled={pending || processed >= limit}
          loading={active === "discovery"}
          onClick={() => act(runDiscoveryAction, "discovery")}
        >
          {active === "discovery" ? "Discovering…" : "Run manual discovery"}
        </Button>
      </div>
      <ul className="mt-4 space-y-3">
        {sources.map((s) => (
          <li className="break-words" key={s.id}>
            <p>
              {s.label} · {s.enabled ? "Enabled" : "Disabled"}
            </p>
            <p className="text-sm text-text-muted">
              {s.runs[0]
                ? `${s.runs[0].state} · ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(s.runs[0].startedAt)} · ${s.runs[0].imported} new jobs`
                : "Never synced"}
              {s.runs[0]?.error ? ` · ${s.runs[0].error}` : ""}
            </p>
            {settings && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    act(
                      () =>
                        sourceControlAction({
                          id: s.id,
                          operation: s.enabled ? "disable" : "enable",
                        }),
                      `toggle:${s.id}`,
                    )
                  }
                  loading={active === `toggle:${s.id}`}
                >
                  {active === `toggle:${s.id}`
                    ? "Updating…"
                    : s.enabled
                      ? "Disable"
                      : "Enable"}
                </Button>
                {s.companyQuery && (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      act(
                        () =>
                          sourceControlAction({
                            id: s.id,
                            operation: "remove",
                          }),
                        `remove:${s.id}`,
                      )
                    }
                    loading={active === `remove:${s.id}`}
                  >
                    {active === `remove:${s.id}`
                      ? "Removing…"
                      : "Remove tracked company"}
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {settings && (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void act(
              () =>
                sourceControlAction({
                  operation: "add",
                  provider: form.get("provider"),
                  companyQuery: form.get("companyQuery"),
                  name: form.get("name"),
                }),
              "add",
            );
          }}
        >
          <h3 className="mb-3">Tracked companies</h3>
          <fieldset disabled={pending} className="min-w-0">
            <div className="form-grid">
              <label className="field-label">
                Company name
                <input
                  name="name"
                  className="field-input"
                  required
                  maxLength={150}
                />
              </label>
              <label className="field-label">
                Public API
                <select name="provider" className="field-input">
                  <option value="himalayas">Himalayas</option>
                  <option value="remotive">Remotive</option>
                </select>
              </label>
              <label className="field-label">
                Company slug / name filter
                <input
                  name="companyQuery"
                  className="field-input"
                  required
                  maxLength={100}
                />
              </label>
            </div>
            <p className="field-hint">
              Himalayas uses companySlug from its API; Remotive uses
              company_name. Greenhouse, Lever, Ashby and Workable are
              unavailable pending permission review. Adzuna and Jooble are not
              configured; no key is required for these two enabled public APIs.
            </p>
            <Button
              className="mt-3"
              disabled={pending}
              loading={active === "add"}
            >
              {active === "add" ? "Adding…" : "Add tracked company"}
            </Button>
          </fieldset>
        </form>
      )}
      <FormFeedback result={result} />
    </section>
  );
}
