import { defaultSettings, getDb, SETTINGS_ID } from "./db";
import type { AppSettings, Rule, Setup, Trade } from "./types";

/**
 * Storage abstraction. All persistence goes through this module so the
 * underlying engine (Dexie/IndexedDB today, SQLite / Capacitor Filesystem /
 * Tauri FS later) can be swapped without touching UI code.
 */
export interface StorageAdapter {
  listTrades(): Promise<Trade[]>;
  putTrade(trade: Trade): Promise<void>;
  deleteTrade(id: string): Promise<void>;
  listSetups(): Promise<Setup[]>;
  putSetup(setup: Setup): Promise<void>;
  deleteSetup(id: string): Promise<void>;
  listRules(): Promise<Rule[]>;
  putRule(rule: Rule): Promise<void>;
  deleteRule(id: string): Promise<void>;
  getSettings(): Promise<AppSettings>;
  putSettings(settings: AppSettings): Promise<void>;
  replaceAll(data: {
    trades: Trade[];
    setups: Setup[];
    rules: Rule[];
    settings: AppSettings | null;
  }): Promise<void>;
  clearAll(): Promise<void>;
}

export const dexieStorage: StorageAdapter = {
  async listTrades() {
    return getDb().trades.toArray();
  },
  async putTrade(trade) {
    await getDb().trades.put(trade);
  },
  async deleteTrade(id) {
    await getDb().trades.delete(id);
  },
  async listSetups() {
    return getDb().setups.toArray();
  },
  async putSetup(setup) {
    await getDb().setups.put(setup);
  },
  async deleteSetup(id) {
    await getDb().setups.delete(id);
  },
  async listRules() {
    return getDb().rules.toArray();
  },
  async putRule(rule) {
    await getDb().rules.put(rule);
  },
  async deleteRule(id) {
    await getDb().rules.delete(id);
  },
  async getSettings() {
    const existing = await getDb().settings.get(SETTINGS_ID);
    if (existing) return existing;
    const fresh = defaultSettings();
    await getDb().settings.put(fresh);
    return fresh;
  },
  async putSettings(settings) {
    await getDb().settings.put({ ...settings, id: SETTINGS_ID });
  },
  async replaceAll({ trades, setups, rules, settings }) {
    const db = getDb();
    await db.transaction("rw", db.trades, db.setups, db.rules, db.settings, async () => {
      await Promise.all([db.trades.clear(), db.setups.clear(), db.rules.clear()]);
      if (trades.length) await db.trades.bulkPut(trades);
      if (setups.length) await db.setups.bulkPut(setups);
      if (rules.length) await db.rules.bulkPut(rules);
      if (settings) await db.settings.put({ ...settings, id: SETTINGS_ID });
    });
  },
  async clearAll() {
    const db = getDb();
    await db.transaction("rw", db.trades, db.setups, db.rules, db.settings, async () => {
      await Promise.all([
        db.trades.clear(),
        db.setups.clear(),
        db.rules.clear(),
        db.settings.clear(),
      ]);
    });
  },
};

export const storage: StorageAdapter = dexieStorage;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
