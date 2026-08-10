import { APP_VERSION, SCHEMA_VERSION } from "./db";
import { downloadBlob, saveBackupToFilesystem, pickBackupFile } from "./platform";
import { storage } from "./storage";
import type { BackupPayload, Trade } from "./types";

export async function buildBackup(): Promise<BackupPayload> {
  const [trades, setups, rules, settings] = await Promise.all([
    storage.listTrades(),
    storage.listSetups(),
    storage.listRules(),
    storage.getSettings(),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    trades,
    setups,
    rules,
  };
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export async function exportData(useFilePicker = true): Promise<"picker" | "download"> {
  const payload = await buildBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const name = `trade-vault-backup-${stamp()}.json`;
  if (useFilePicker) return saveBackupToFilesystem(name, blob);
  downloadBlob(name, blob);
  return "download";
}

export function validateBackup(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== "object") throw new Error("Backup file is not valid JSON object");
  const data = raw as Partial<BackupPayload>;
  if (typeof data.schemaVersion !== "number") throw new Error("Missing schemaVersion");
  if (!Array.isArray(data.trades)) throw new Error("Missing trades array");
  if (!Array.isArray(data.setups)) throw new Error("Missing setups array");
  if (!Array.isArray(data.rules)) throw new Error("Missing rules array");
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Backup was made with a newer version (schema ${data.schemaVersion})`);
  }
  return {
    schemaVersion: data.schemaVersion,
    appVersion: data.appVersion ?? "unknown",
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    settings: data.settings ?? null,
    trades: data.trades,
    setups: data.setups,
    rules: data.rules,
  };
}

export async function importData(payload: BackupPayload, safetyBackup = true) {
  if (safetyBackup) {
    try {
      const current = await buildBackup();
      const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
      downloadBlob(`trade-vault-safety-backup-${stamp()}.json`, blob);
    } catch {
      // never block a restore because the safety copy failed
    }
  }
  await storage.replaceAll({
    trades: payload.trades,
    setups: payload.setups,
    rules: payload.rules,
    settings: payload.settings,
  });
}

export async function importFromFile(safetyBackup = true) {
  const file = await pickBackupFile("application/json");
  if (!file) return null;
  const payload = validateBackup(JSON.parse(file.text));
  await importData(payload, safetyBackup);
  return payload;
}

const CSV_COLUMNS = [
  "symbol",
  "direction",
  "status",
  "entryDate",
  "exitDate",
  "entryPrice",
  "exitPrice",
  "quantity",
  "fees",
  "grossPnl",
  "netPnl",
  "rMultiple",
  "setup",
  "strategy",
  "tags",
  "notes",
] as const;

function csvCell(value: unknown) {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tradesToCsv(trades: Trade[]): string {
  const rows = trades.map((t) =>
    [
      t.symbol,
      t.direction,
      t.status,
      t.entryDate,
      t.exitDate ?? "",
      t.entryPrice,
      t.exitPrice ?? "",
      t.quantity,
      t.fees,
      t.grossPnl,
      t.netPnl,
      t.rMultiple,
      t.setupName ?? "",
      t.strategy,
      t.tags.join("|"),
      t.notes,
    ]
      .map(csvCell)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

export async function exportTradesCsv(trades: Trade[]) {
  const blob = new Blob([tradesToCsv(trades)], { type: "text/csv" });
  return saveBackupToFilesystem(`trade-vault-trades-${stamp()}.csv`, blob);
}
