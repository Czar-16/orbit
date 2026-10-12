// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
import { generateResumeDocuments } from "@/lib/resume-document-worker";
import {
  buildTailoredContent,
  tailoringCandidates,
} from "@/lib/tailored-resume";
import { proposeStructure } from "@/lib/resume-content";
import { emptyProfile } from "@/lib/profile-schema";
const source = proposeStructure("Synthetic Candidate");
source.items[0].section = "contact";
source.items[0].confirmed = true;
const content = buildTailoredContent(
  tailoringCandidates(source, emptyProfile(), [], null),
);
function child() {
  return Object.assign(new EventEmitter(), {
    stdout: Object.assign(new EventEmitter(), { setEncoding: vi.fn() }),
    stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
    kill: vi.fn(),
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  mocks.spawn.mockReset();
});
afterEach(() => vi.useRealTimers());
it("kills timed-out workers and enforces the heap setting", async () => {
  const process = child();
  mocks.spawn.mockReturnValue(process);
  const promise = generateResumeDocuments(content);
  const assertion = expect(promise).rejects.toThrow("30 seconds");
  await vi.advanceTimersByTimeAsync(30000);
  await assertion;
  expect(process.kill).toHaveBeenCalledWith("SIGKILL");
  expect(mocks.spawn.mock.calls[0][1][0]).toBe("--max-old-space-size=256");
});
it.each(["crash", "malformed", "oversize"])(
  "rejects worker %s with no approval",
  async (mode) => {
    const process = child();
    mocks.spawn.mockReturnValue(process);
    const promise = generateResumeDocuments(content);
    const assertion = expect(promise).rejects.toThrow();
    if (mode === "oversize")
      process.stdout.emit("data", "x".repeat(14_100_001));
    else {
      process.stdout.emit(
        "data",
        mode === "malformed"
          ? "not json"
          : JSON.stringify({ error: "Synthetic worker failure" }),
      );
      process.emit("close", mode === "crash" ? 1 : 0);
    }
    await assertion;
  },
);
