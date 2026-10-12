import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  appliedDate,
  dateAtMidnight,
  requireTransition,
  statuses,
  trackingCommandSchema,
  trackerFilterSchema,
  transitions,
} from "@/lib/tracking";
import { csvCell, localExportRequest, tableCsv } from "@/lib/export-format";
describe("tracking confirmation and dates", () => {
  it("rejects missing confirmation and future Kolkata dates", () => {
    const now = new Date("2026-10-12T18:31:00Z");
    expect(() => appliedDate("2026-10-13", false, now)).toThrow(/Confirm/);
    expect(() => appliedDate("2026-10-14", true, now)).toThrow(/today/);
    expect(appliedDate("2026-10-13", true, now).toISOString()).toBe(
      "2026-10-12T18:30:00.000Z",
    );
    expect(() => appliedDate("2026-02-30", true, now)).toThrow();
    expect(dateAtMidnight("2026-01-01").toISOString()).toBe(
      "2025-12-31T18:30:00.000Z",
    );
  });
  it("allows only the approved graph; preparation never implies interview", () => {
    for (const from of statuses)
      for (const to of statuses) {
        if (transitions[from].includes(to))
          expect(() => requireTransition(from, to)).not.toThrow();
        else expect(() => requireTransition(from, to)).toThrow();
      }
    expect(() => requireTransition("DRAFT_READY", "INTERVIEW")).toThrow();
  });
  it("rejects unknown action fields, invalid follow-ups and bad filter ranges", () => {
    expect(
      trackingCommandSchema.safeParse({
        id: "not-an-id",
        expectedRevision: 1,
        operation: "note",
        note: "test",
      }).success,
    ).toBe(false);
    expect(
      trackerFilterSchema.safeParse({ minScore: "80", maxScore: "20" }).success,
    ).toBe(false);
    expect(
      trackerFilterSchema.safeParse({ from: "2026-10-13", to: "2026-10-12" })
        .success,
    ).toBe(false);
    expect(
      trackerFilterSchema.safeParse({
        status: "APPLIED",
        page: "2",
        minScore: "0",
      }).success,
    ).toBe(true);
    expect(trackerFilterSchema.safeParse({ status: "applied" }).success).toBe(
      false,
    );
  });
});
describe("private data export formatting and request checks", () => {
  it("quotes multiline content, nested history and null without losing fields", () => {
    expect(
      tableCsv([
        {
          note: 'a,"b"\nc',
          value: null,
          facts: { provenance: "unknown", value: null },
        },
      ]),
    ).toContain(
      '"a,""b""\nc","null","{""provenance"":""unknown"",""value"":null}"',
    );
    expect(tableCsv([])).toBe("\r\n");
  });
  it("neutralizes spreadsheet formula prefixes including hidden whitespace", () => {
    for (const input of [
      '=HYPERLINK("x")',
      "+123",
      "-123",
      "@SUM(1)",
      " \t=cmd",
      "\nhello",
      "\tfoo",
    ])
      expect(csvCell(input)).toMatch(/^"'/);
    expect(csvCell("ordinary")).toBe('"ordinary"');
  });
  it("blocks foreign host, origin, referrer and cross-site requests", () => {
    const request = (
      headers: Record<string, string>,
      url = "http://localhost:3000/api/export",
    ) => new Request(url, { headers: { host: "localhost:3000", ...headers } });
    expect(localExportRequest(request({}))).toBe(true);
    expect(
      localExportRequest(
        request({
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
    const rejected: Record<string, string>[] = [
      { host: "evil.test" },
      { origin: "https://evil.test" },
      { referer: "https://evil.test/a" },
      { "sec-fetch-site": "cross-site" },
    ];
    for (const headers of rejected)
      expect(localExportRequest(request(headers))).toBe(false);
  });
});

it("accepts NextRequest loopback normalization while checking the actual browser origin and port", () => {
  const request = new NextRequest("http://127.0.0.1:3107/api/export", {
    headers: {
      host: "127.0.0.1:3107",
      origin: "http://127.0.0.1:3107",
      referer: "http://127.0.0.1:3107/settings",
      "sec-fetch-site": "same-origin",
    },
  });
  expect(new URL(request.url).hostname).toBe("localhost");
  expect(localExportRequest(request)).toBe(true);
  expect(
    localExportRequest(
      new NextRequest("http://127.0.0.1:3107/api/export", {
        headers: { host: "127.0.0.1:3107", origin: "http://localhost:3107" },
      }),
    ),
  ).toBe(false);
  expect(
    localExportRequest(
      new Request("http://localhost:3000/api/export", {
        headers: { host: "127.0.0.1:3107" },
      }),
    ),
  ).toBe(false);
});
