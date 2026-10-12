// @vitest-environment node
import { it, expect } from "vitest";
import { contentHash } from "@/lib/content-hash";
it("hashes JSONB object keys canonically without losing array order", () => {
  expect(
    contentHash({
      items: [
        { id: "a", text: "same" },
        { id: "b", text: "same" },
      ],
      resolutions: { name: "source", education: "profile" },
    }),
  ).toBe(
    contentHash({
      resolutions: { education: "profile", name: "source" },
      items: [
        { text: "same", id: "a" },
        { text: "same", id: "b" },
      ],
    }),
  );
  expect(contentHash({ items: ["a", "b"] })).not.toBe(
    contentHash({ items: ["b", "a"] }),
  );
});
