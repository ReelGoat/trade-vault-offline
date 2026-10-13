/** Remembers deleted record ids so a sync can remove them on other devices too. */
const KEY = "tradeVaultTombstones";

export function loadTombstones(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveTombstones(t: Record<string, string>) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(t));
}

export function recordDeletion(id: string) {
  saveTombstones({ ...loadTombstones(), [id]: new Date().toISOString() });
}

export function mergeTombstones(a: Record<string, string>, b: Record<string, string>) {
  const out = { ...b };
  for (const [id, at] of Object.entries(a)) if (!out[id] || at > out[id]) out[id] = at;
  return out;
}
