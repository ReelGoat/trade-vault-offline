import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Github, UploadCloud, DownloadCloud, PlugZap, Eye, EyeOff } from "lucide-react";
import {
  defaultSyncConfig,
  loadSyncConfig,
  pullFromGithub,
  pushToGithub,
  saveSyncConfig,
  testConnection,
  useSyncStatus,
  type GithubSyncConfig,
} from "@/services/github-sync";
import { useVault } from "@/store/vault";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function GithubSyncPanel() {
  const [cfg, setCfg] = useState<GithubSyncConfig>(defaultSyncConfig);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { lastSyncedAt, message, status } = useSyncStatus();
  const load = useVault((s) => s.load);

  useEffect(() => setCfg(loadSyncConfig()), []);

  const update = (patch: Partial<GithubSyncConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveSyncConfig(next);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Github className="size-4" /> GitHub Sync Settings
        </p>
        <SyncStatusBadge />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personal Access Token
          </Label>
          <div className="flex gap-2">
            <Input
              type={show ? "text" : "password"}
              autoComplete="off"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={cfg.token}
              onChange={(e) => update({ token: e.target.value.trim() })}
            />
            <Button variant="secondary" size="icon" aria-label={show ? "Hide token" : "Show token"} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Stored only in this browser. Never sent anywhere except GitHub.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repository name</Label>
          <Input value={cfg.repo} placeholder="trade-vault-backup" onChange={(e) => update({ repo: e.target.value })} />
          <p className="text-[11px] text-muted-foreground">Use "name" or "owner/name". Created privately if missing.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File path</Label>
          <Input value={cfg.path} placeholder="data/trades-sync.json" onChange={(e) => update({ path: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Auto-Sync on Launch</p>
          <p className="text-[11px] text-muted-foreground">Merge with GitHub each time the app opens (when online).</p>
        </div>
        <Switch checked={cfg.autoSync} onCheckedChange={(v) => update({ autoSync: v })} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="gap-1.5"
          disabled={!!busy || !cfg.token}
          onClick={() =>
            run("test", async () => {
              try {
                const login = await testConnection(cfg.token);
                toast.success(`Connected as ${login}`);
              } catch (e) {
                useSyncStatus.getState().set({ status: "error", message: (e as Error).message });
                throw e;
              }
            })
          }
        >
          <PlugZap className="size-4" /> {busy === "test" ? "Testing…" : "Test Connection"}
        </Button>
        <Button
          className="gap-1.5"
          disabled={!!busy || !cfg.token}
          onClick={() =>
            run("push", async () => {
              const r = await pushToGithub(cfg);
              await load();
              toast.success(`Pushed ${r.trades} trades to ${r.repo}`);
            })
          }
        >
          <UploadCloud className="size-4" /> {busy === "push" ? "Pushing…" : "Push to GitHub"}
        </Button>
        <Button
          variant="secondary"
          className="gap-1.5"
          disabled={!!busy || !cfg.token}
          onClick={() =>
            run("pull", async () => {
              const r = await pullFromGithub(cfg);
              await load();
              toast.success(`Pulled from ${r.repo} · ${r.trades} trades`);
            })
          }
        >
          <DownloadCloud className="size-4" /> {busy === "pull" ? "Pulling…" : "Pull from GitHub"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {status === "error" && message ? `${message} · ` : ""}
        Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "never"} · Pull and push merge by
        record — the most recently edited version of each trade wins, deleted trades are removed everywhere on the next sync.
      </p>

      <details className="rounded-xl border border-border bg-secondary/30 p-4 text-sm">
        <summary className="cursor-pointer font-medium">How to create a GitHub token (classic, repo scope)</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Sign in to GitHub and open <span className="text-foreground">Settings → Developer settings</span>.</li>
          <li>Choose <span className="text-foreground">Personal access tokens → Tokens (classic)</span>.</li>
          <li>Click <span className="text-foreground">Generate new token (classic)</span>.</li>
          <li>Give it a name like "Trade Vault" and pick an expiration.</li>
          <li>Tick the <span className="text-foreground">repo</span> scope (full control of private repositories).</li>
          <li>Click <span className="text-foreground">Generate token</span> and copy it — GitHub only shows it once.</li>
          <li>Paste it above, press <span className="text-foreground">Test Connection</span>, then <span className="text-foreground">Push to GitHub</span>.</li>
          <li>On your other devices, enter the same token, repo and path, then press <span className="text-foreground">Pull from GitHub</span>.</li>
        </ol>
        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=Trade%20Vault"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-primary underline-offset-4 hover:underline"
        >
          Open GitHub token page →
        </a>
      </details>
    </div>
  );
}
