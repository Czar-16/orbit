import { ProvenanceBadge } from "@/components/provenance-badge";
import { readListingHistory } from "@/lib/job-history";

type Revision = {
  revision: number;
  capturedAt: Date;
  method: string;
  schemaVersion: number;
  listingUrl: string | null;
  sourceSnapshot: unknown;
};

export function JobRevisionHistory({ history }: { history: Revision[] }) {
  return (
    <section className="panel mt-4">
      <h2 className="mb-4">Revision history</h2>
      <ul className="space-y-4 text-xs text-text-muted">
        {history.map((item) => {
          const snapshot = readListingHistory(item);
          return (
            <li key={item.revision}>
              <p>
                Revision {item.revision} ·{" "}
                {item.method.toLowerCase().replaceAll("_", " ")} ·{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(item.capturedAt)}
              </p>
              {snapshot ? (
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt>Source at this revision</dt>
                    <dd className="mt-1 break-words">
                      {snapshot.source.label}{" "}
                      <ProvenanceBadge
                        provenance={snapshot.source.evidence.provenance}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Listing URL at this revision</dt>
                    <dd className="mt-1 break-all">
                      {snapshot.listingUrl ? (
                        <span className="font-mono">{snapshot.listingUrl}</span>
                      ) : (
                        "No listing URL supplied"
                      )}{" "}
                      <ProvenanceBadge
                        provenance={
                          snapshot.listingUrl ? "user-provided" : "unknown"
                        }
                      />
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2">
                  Historical listing URL and source are unavailable.{" "}
                  <ProvenanceBadge provenance="unknown" />
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
