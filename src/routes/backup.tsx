import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, DatabaseBackup, Trash2 } from "lucide-react";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { exportData, exportTradesCsv, importFromFile } from "@/services/backup";
import { supportsFileSystemAccess } from "@/services/platform";
import { LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — Trade Vault" },
      { name: "description", content: "Export a complete JSON backup of your trades, setups and rules, or restore from a previous backup file." },
      { property: "og:title", content: "Backup & Restore — Trade Vault" },
      { property: "og:description", content: "Own your data: full JSON and CSV export, one-click restore." },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const hydrated = useVaultBoot();
  const { trades, setups, rules, load, clearAll } = useVault();
  const [safety, setSafety] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <LoadingGrid count={3} />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Backup & data"
        subtitle={`${trades.length} trades · ${setups.length} setups · ${rules.length} rules stored locally`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <DatabaseBackup className="size-4 text-primary" /> Export
          </p>
          <p className="text-sm text-muted-foreground">
            A complete JSON snapshot including schema version, settings, trades, setups and rules. Attachments are
            embedded, so large image libraries make bigger files.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              className="gap-2"
              onClick={() =>
                run(async () => {
                  const mode = await exportData(true);
                  toast.success(mode === "picker" ? "Backup saved" : "Backup downloaded");
                })
              }
            >
              <Download className="size-4" /> Export JSON backup
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              className="gap-2"
              onClick={() =>
                run(async () => {
                  await exportTradesCsv(trades);
                  toast.success("CSV exported");
                })
              }
            >
              <FileSpreadsheet className="size-4" /> Export trades CSV
            </Button>
          </div>
          {!supportsFileSystemAccess() && (
            <p className="text-xs text-muted-foreground">
              This browser has no folder picker — files download to your default downloads folder instead.
            </p>
          )}
        </div>

        <div className="panel space-y-3 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="size-4 text-primary" /> Import / restore
          </p>
          <p className="text-sm text-muted-foreground">
            Restoring replaces everything currently in this vault with the contents of the backup file.
          </p>
          <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm">
            Create a safety backup first
            <Switch checked={safety} onCheckedChange={setSafety} />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" disabled={busy} className="w-full gap-2">
                <Upload className="size-4" /> Import backup file
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace all local data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your current trades, setups, rules and settings will be replaced by the imported backup.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    void run(async () => {
                      const payload = await importFromFile(safety);
                      if (!payload) return;
                      await load();
                      toast.success(`Restored ${payload.trades.length} trades`);
                    })
                  }
                >
                  Choose file & restore
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="panel space-y-3 border-destructive/30 p-5">
        <p className="text-sm font-semibold text-loss">Danger zone</p>
        <p className="text-sm text-muted-foreground">Erase every trade, setup and rule stored on this device.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="size-4" /> Erase all local data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erase everything?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your local vault. Export a backup first if you might need it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void run(async () => {
                    await clearAll();
                    toast.success("All local data erased");
                  })
                }
              >
                Erase
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
