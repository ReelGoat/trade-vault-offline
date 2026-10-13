import { create } from "zustand";
import { buildBackup, validateBackup } from "./backup";
import { storage } from "./storage";
import type { BackupPayload } from "./types";
import { loadTombstones, mergeTombstones, saveTombstones } from "./tombstones";

/**
 * Optional GitHub sync. The local IndexedDB stays the source of truth;
 * GitHub is only a remote mirror the user brings their own token for.
 */

const CONFIG_KEY = "tradeVaultGithubSync";
const API = "https://api.github.com";

export interface GithubSyncConfig {
  token: string;
  repo: string;
  path: string;
  autoSync: boolean;
}

export type SyncStatus = "idle" | "synced" | "syncing" | "dirty" | "error";

export const defaultSyncConfig: GithubSyncConfig = {
  token: "",
  repo: "trade-vault-backup",
  path: "data/trades-sync.json",
  autoSync: false,
};

export function loadSyncConfig(): GithubSyncConfig {
  if (typeof window === "undefined") return defaultSyncConfig;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    return raw ? { ...defaultSyncConfig, ...JSON.parse(raw) } : defaultSyncConfig;
  } catch {
    return defaultSyncConfig;
  }
}

export function saveSyncConfig(cfg: GithubSyncConfig) {
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

interface SyncState {
  status: SyncStatus;
  message: string;
  lastSyncedAt: string | null;
  pendingPush: boolean;
  set: (patch: Partial<Omit<SyncState, "set">>) => void;
}

const META_KEY = "tradeVaultGithubSyncMeta";
function readMeta(): { lastSyncedAt: string | null; pendingPush: boolean } {
  if (typeof window === "undefined") return { lastSyncedAt: null, pendingPush: false };
  try {
    return { lastSyncedAt: null, pendingPush: false, ...JSON.parse(window.localStorage.getItem(META_KEY) ?? "{}") };
  } catch {
    return { lastSyncedAt: null, pendingPush: false };
  }
}

export const useSyncStatus = create<SyncState>((set, get) => ({
  status: "idle",
  message: "",
  lastSyncedAt: null,
  pendingPush: false,
  set: (patch) => {
    set(patch);
    if (typeof window !== "undefined") {
      const { lastSyncedAt, pendingPush } = get();
      window.localStorage.setItem(META_KEY, JSON.stringify({ lastSyncedAt, pendingPush }));
    }
  },
}));

export function hydrateSyncMeta() {
  const meta = readMeta();
  useSyncStatus.setState({
    ...meta,
    status: meta.pendingPush ? "dirty" : meta.lastSyncedAt ? "synced" : "idle",
  });
}

export function markLocalChange() {
  const cfg = loadSyncConfig();
  if (!cfg.token) return;
  const s = useSyncStatus.getState();
  if (s.status === "syncing") return;
  s.set({ status: "dirty", pendingPush: true, message: "Local changes not yet pushed" });
  scheduleAutoPush();
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/** Push edits/deletes to GitHub shortly after they happen (when online). */
function scheduleAutoPush() {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const cfg = loadSyncConfig();
    if (!cfg.token || !navigator.onLine) return;
    if (useSyncStatus.getState().status === "syncing") return scheduleAutoPush();
    void pushToGithub(cfg)
      .then(() => import("@/store/vault").then((m) => m.useVault.getState().load()))
      .catch(() => {});
  }, 2500);
}

// ---------- GitHub helpers ----------

class GithubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function gh(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { message?: string }).message ?? msg;
    } catch {
      /* ignore */
    }
    if (res.status === 401) msg = "Invalid or expired token";
    throw new GithubError(res.status, msg);
  }
  return res.status === 204 ? null : res.json();
}

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromBase64(b64: string) {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function testConnection(token: string): Promise<string> {
  const user = (await gh(token, "/user")) as { login: string };
  return user.login;
}

async function resolveRepo(cfg: GithubSyncConfig) {
  const repo = cfg.repo.trim();
  if (repo.includes("/")) return repo;
  const login = await testConnection(cfg.token);
  return `${login}/${repo}`;
}

function contentsPath(fullRepo: string, path: string) {
  const clean = path.trim().replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `/repos/${fullRepo}/contents/${clean}`;
}

async function getRemote(cfg: GithubSyncConfig, fullRepo: string) {
  try {
    const file = (await gh(cfg.token, contentsPath(fullRepo, cfg.path))) as { sha: string; content: string };
    return { sha: file.sha, payload: validateBackup(JSON.parse(fromBase64(file.content))) };
  } catch (e) {
    if (e instanceof GithubError && e.status === 404) return null;
    throw e;
  }
}

async function ensureRepo(cfg: GithubSyncConfig, fullRepo: string) {
  try {
    await gh(cfg.token, `/repos/${fullRepo}`);
  } catch (e) {
    if (!(e instanceof GithubError) || e.status !== 404) throw e;
    const name = fullRepo.split("/")[1];
    await gh(cfg.token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({ name, private: true, auto_init: true, description: "Trade Vault sync data" }),
    });
  }
}

/** Merge two record lists by id, keeping whichever copy was updated last. */
export function mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(r.id, r);
  for (const l of local) {
    const r = map.get(l.id);
    if (!r || (l.updatedAt ?? "") >= (r.updatedAt ?? "")) map.set(l.id, l);
  }
  return [...map.values()];
}

/** Drop records deleted after their last edit. */
export function applyTombstones<T extends { id: string; updatedAt?: string }>(list: T[], deleted: Record<string, string>): T[] {
  return list.filter((r) => {
    const d = deleted[r.id];
    return !d || (r.updatedAt ?? "") > d;
  });
}

function mergePayloads(local: BackupPayload, remote: BackupPayload): BackupPayload {
  const deleted = mergeTombstones(local.deleted ?? {}, remote.deleted ?? {});
  const settings =
    !remote.settings || (local.settings && local.settings.updatedAt >= remote.settings.updatedAt)
      ? local.settings
      : remote.settings;
  return {
    ...local,
    settings,
    deleted,
    trades: applyTombstones(mergeById(local.trades, remote.trades), deleted),
    setups: applyTombstones(mergeById(local.setups, remote.setups), deleted),
    rules: applyTombstones(mergeById(local.rules, remote.rules), deleted),
  };
}

function requireReady(cfg: GithubSyncConfig) {
  if (!cfg.token) throw new Error("Add a GitHub token first");
  if (!cfg.repo.trim() || !cfg.path.trim()) throw new Error("Repository and file path are required");
}

async function runSync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const s = useSyncStatus.getState();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    s.set({ status: "dirty", pendingPush: true, message: "Offline — changes queued, will push when back online" });
    throw new Error("You're offline. Changes are queued and will sync when you reconnect.");
  }
  s.set({ status: "syncing", message: label });
  try {
    const out = await fn();
    useSyncStatus.getState().set({
      status: "synced",
      pendingPush: false,
      lastSyncedAt: new Date().toISOString(),
      message: "Up to date with GitHub",
    });
    return out;
  } catch (e) {
    useSyncStatus.getState().set({ status: "error", message: (e as Error).message });
    throw e;
  }
}

export async function pushToGithub(cfg = loadSyncConfig()) {
  requireReady(cfg);
  return runSync("Pushing to GitHub…", async () => {
    const fullRepo = await resolveRepo(cfg);
    await ensureRepo(cfg, fullRepo);
    const remote = await getRemote(cfg, fullRepo);
    const local = { ...(await buildBackup()), deleted: loadTombstones() };
    // merge first so another device's changes are never overwritten
    const merged = remote ? mergePayloads(local, remote.payload) : local;
    if (remote) await storage.replaceAll(merged);
    saveTombstones(merged.deleted ?? {});
    await gh(cfg.token, contentsPath(fullRepo, cfg.path), {
      method: "PUT",
      body: JSON.stringify({
        message: `Trade Vault sync ${new Date().toISOString()}`,
        content: toBase64(JSON.stringify({ ...merged, exportedAt: new Date().toISOString() }, null, 2)),
        ...(remote ? { sha: remote.sha } : {}),
      }),
    });
    return { repo: fullRepo, trades: merged.trades.length };
  });
}

export async function pullFromGithub(cfg = loadSyncConfig()) {
  requireReady(cfg);
  return runSync("Pulling from GitHub…", async () => {
    const fullRepo = await resolveRepo(cfg);
    const remote = await getRemote(cfg, fullRepo);
    if (!remote) throw new Error(`No sync file found at ${fullRepo}/${cfg.path}. Push first.`);
    const merged = mergePayloads({ ...(await buildBackup()), deleted: loadTombstones() }, remote.payload);
    await storage.replaceAll(merged);
    saveTombstones(merged.deleted ?? {});
    return { repo: fullRepo, trades: merged.trades.length };
  });
}
