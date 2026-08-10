import Dexie, { type Table } from "dexie";
import type { AppSettings, Rule, Setup, Trade } from "./types";

export const SCHEMA_VERSION = 1;
export const APP_VERSION = "1.0.0";
export const SETTINGS_ID = "app-settings";

export class TradeVaultDB extends Dexie {
  trades!: Table<Trade, string>;
  setups!: Table<Setup, string>;
  rules!: Table<Rule, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("trade-vault");
    this.version(1).stores({
      trades: "id, symbol, status, entryDate, exitDate, setupId, strategy, direction",
      setups: "id, name, isActive",
      rules: "id, name, category, isActive",
      settings: "id",
    });
  }
}

let _db: TradeVaultDB | null = null;

/** Lazily create the Dexie instance so it never runs during SSR. */
export function getDb(): TradeVaultDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment");
  }
  if (!_db) _db = new TradeVaultDB();
  return _db;
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export const defaultSettings = (): AppSettings => ({
  id: SETTINGS_ID,
  accountStartingBalance: 10000,
  defaultRiskPercent: 1,
  baseCurrency: "USD",
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  defaultCommission: 0,
  instruments: ["EURUSD", "GBPUSD", "XAUUSD", "NAS100", "BTCUSD"],
  theme: "dark",
  backupReminder: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
