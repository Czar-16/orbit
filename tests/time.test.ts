import { describe, it, expect } from "vitest";
import { localDate, todayInterval } from "@/lib/time";
describe("Asia/Kolkata days", () => {
  it("changes day at 18:30 UTC", () => {
    expect(localDate(new Date("2026-10-11T18:29:59Z"))).toBe("2026-10-11");
    expect(localDate(new Date("2026-10-11T18:30:00Z"))).toBe("2026-10-12");
  });
  it("returns half-open UTC day boundaries", () => {
    const day = todayInterval(new Date("2026-10-12T12:00:00Z"));
    expect(day.start.toISOString()).toBe("2026-10-11T18:30:00.000Z");
    expect(day.end.toISOString()).toBe("2026-10-12T18:30:00.000Z");
  });
});
