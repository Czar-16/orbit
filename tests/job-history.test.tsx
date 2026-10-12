import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  captureManualSource,
  readListingHistory,
  sourceSnapshotSchema,
} from "@/lib/job-history";
import { JobRevisionHistory } from "@/components/job-revision-history";

const snapshot = captureManualSource({
  identity: "manual:example.com",
  label: "Original source",
  kind: "MANUAL",
});
describe("listing revision snapshots", () => {
  it("does not substitute current identity for legacy or malformed snapshots", () => {
    expect(
      readListingHistory({
        schemaVersion: 1,
        listingUrl: "https://example.com/current",
        sourceSnapshot: snapshot,
      }),
    ).toBeNull();
    expect(
      readListingHistory({
        schemaVersion: 2,
        listingUrl: null,
        sourceSnapshot: {},
      }),
    ).toBeNull();
    expect(
      sourceSnapshotSchema.safeParse({ ...snapshot, kind: "OFFICIAL_API" })
        .success,
    ).toBe(false);
    expect(
      sourceSnapshotSchema.safeParse({ ...snapshot, applied: true }).success,
    ).toBe(false);
  });
  it("shows old source and URL, missing supplied URL, and unknown legacy history separately", () => {
    const base = {
      capturedAt: new Date("2026-10-12T00:00:00Z"),
      method: "PASTED_DESCRIPTION",
    };
    render(
      <JobRevisionHistory
        history={[
          {
            ...base,
            revision: 1,
            schemaVersion: 1,
            listingUrl: null,
            sourceSnapshot: null,
          },
          {
            ...base,
            revision: 2,
            schemaVersion: 2,
            listingUrl: "https://example.com/old",
            sourceSnapshot: snapshot,
          },
          {
            ...base,
            revision: 3,
            schemaVersion: 2,
            listingUrl: null,
            sourceSnapshot: captureManualSource({
              identity: "manual",
              label: "Manual import",
              kind: "MANUAL",
            }),
          },
        ]}
      />,
    );
    expect(screen.getByText("https://example.com/old")).toBeInTheDocument();
    expect(screen.getByText("Original source")).toBeInTheDocument();
    expect(screen.getByText("No listing URL supplied")).toBeInTheDocument();
    expect(
      screen.getByText(/Historical listing URL and source are unavailable/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
