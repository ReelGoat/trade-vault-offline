import { describe, it, expect, vi, afterEach } from "vitest";
import { mergeById, mergePayloads, pullFromGithub, pushToGithub } from "../github-sync";
import { defaultSettings } from "../db";
import { storage } from "../storage";
import type { BackupPayload } from "../types";
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

const remoteAccount: BackupPayload = {
  schemaVersion: 1, appVersion: "1.0.0", exportedAt: "2026-01-02T00:00:00Z",
  trades: [], setups: [], rules: [],
  settings: {
    ...defaultSettings(), accountStartingBalance: 25000, baseCurrency: "EUR",
    defaultRiskPercent: 2, defaultCommission: 5, timezone: "Africa/Addis_Ababa",
    instruments: ["XAUUSD"], theme: "light", backupReminder: false,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z",
  },
};

function freshAccount(legacy = false): BackupPayload {
  return {
    ...remoteAccount, settings: {
      ...defaultSettings(), createdAt: "2026-10-23T00:00:00.000Z",
      updatedAt: legacy ? "2026-10-23T00:00:00.001Z" : "",
    },
  };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("account settings sync", () => {
  it("restores the entire saved account instead of fresh 10000 defaults", () => {
    expect(freshAccount().settings?.accountStartingBalance).toBe(10000);
    expect(mergePayloads(freshAccount(), remoteAccount).settings).toEqual(remoteAccount.settings);
  });
  it("recognizes legacy fresh defaults despite their newer timestamp", () => {
    expect(mergePayloads(freshAccount(true), remoteAccount).settings).toEqual(remoteAccount.settings);
  });
  it("keeps deliberately edited local account settings when newer", () => {
    const local = freshAccount();
    local.settings = { ...defaultSettings(), accountStartingBalance: 10000,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-10-23T01:00:00Z" };
    expect(mergePayloads(local, remoteAccount).settings).toEqual(local.settings);
  });
  it("does not let newer remote defaults overwrite an edited account", () => {
    expect(mergePayloads(remoteAccount, freshAccount(true)).settings).toEqual(remoteAccount.settings);
  });
  it.each(["push", "pull"])("%s restores all remote preferences through storage", async (operation) => {
    vi.stubGlobal("navigator", { onLine: true });
    const local = freshAccount(true);
    vi.spyOn(storage, "listTrades").mockResolvedValue(local.trades);
    vi.spyOn(storage, "listSetups").mockResolvedValue(local.setups);
    vi.spyOn(storage, "listRules").mockResolvedValue(local.rules);
    const settings = local.settings;
    if (!settings) throw new Error("Missing test settings");
    vi.spyOn(storage, "getSettings").mockResolvedValue(settings);
    const replace = vi.spyOn(storage, "replaceAll").mockResolvedValue();
    const requests: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      requests.push(init);
      return new Response(JSON.stringify(url.includes("/contents/") && init.method !== "PUT"
        ? { sha: "test-sha", content: btoa(JSON.stringify(remoteAccount)) } : {}), { status: 200 });
    }));
    const cfg = { token: "test-only-token", repo: "test/backup", path: "data/trades-sync.json", autoSync: false };
    await (operation === "push" ? pushToGithub(cfg) : pullFromGithub(cfg));
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ settings: remoteAccount.settings }));
    if (operation === "push") {
      const put = requests.find((request) => request.method === "PUT");
      const body = JSON.parse(String(put?.body));
      expect(JSON.parse(atob(body.content)).settings.accountStartingBalance).toBe(25000);
    }
  });
});
