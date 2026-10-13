import { describe, it, expect } from "vitest";
import { mergeById } from "../github-sync";
describe("mergeById", () => {
  it("keeps the most recently updated copy and union of ids", () => {
    const out = mergeById(
      [{ id: "a", updatedAt: "2026-01-02" }, { id: "b", updatedAt: "2026-01-01" }],
      [{ id: "a", updatedAt: "2026-01-01" }, { id: "b", updatedAt: "2026-01-05" }, { id: "c", updatedAt: "2026-01-01" }],
    );
    const byId = Object.fromEntries(out.map((r) => [r.id, r.updatedAt]));
    expect(byId).toEqual({ a: "2026-01-02", b: "2026-01-05", c: "2026-01-01" });
  });
});

import { applyTombstones } from "../github-sync";
describe("deletion sync", () => {
  it("removes a trade deleted after its last edit", () => {
    const list = [{ id: "a", updatedAt: "2026-01-01" }, { id: "b", updatedAt: "2026-01-01" }];
    expect(applyTombstones(list, { a: "2026-02-01" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("keeps a trade edited after it was deleted", () => {
    expect(applyTombstones([{ id: "a", updatedAt: "2026-03-01" }], { a: "2026-02-01" })).toHaveLength(1);
  });
});
