import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { getPlatform, isStandalone, supportsFileSystemAccess } from "@/services/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Trade Vault" },
      { name: "description", content: "Set your starting balance, default risk, currency, timezone, commissions and instrument list." },
      { property: "og:title", content: "Settings — Trade Vault" },
      { property: "og:description", content: "Tune Trade Vault to your account and trading style." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const hydrated = useVaultBoot();
  const { settings, saveSettings } = useVault();
  const [instrument, setInstrument] = useState("");

  if (!hydrated) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-5">
      <SectionTitle title="Settings" subtitle="Preferences are stored locally on this device" />

      <div className="panel space-y-4 p-5">
        <p className="text-sm font-semibold">Trading preferences</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Account starting balance">
            <Input
              type="number"
              step="any"
              value={settings.accountStartingBalance}
              onChange={(e) => void saveSettings({ accountStartingBalance: Number(e.target.value) || 0 })}
            />
          </Row>
          <Row label="Default risk percent">
            <Input
              type="number"
              step="any"
              value={settings.defaultRiskPercent}
              onChange={(e) => void saveSettings({ defaultRiskPercent: Number(e.target.value) || 0 })}
            />
          </Row>
          <Row label="Base currency">
            <Input
              value={settings.baseCurrency}
              onChange={(e) => void saveSettings({ baseCurrency: e.target.value.toUpperCase().slice(0, 3) })}
            />
          </Row>
          <Row label="Timezone">
            <Input value={settings.timezone} onChange={(e) => void saveSettings({ timezone: e.target.value })} />
          </Row>
          <Row label="Default commission">
            <Input
              type="number"
              step="any"
              value={settings.defaultCommission}
              onChange={(e) => void saveSettings({ defaultCommission: Number(e.target.value) || 0 })}
            />
          </Row>
          <Row label="Backup reminders">
            <div className="flex h-10 items-center">
              <Switch
                checked={settings.backupReminder}
                onCheckedChange={(v) => void saveSettings({ backupReminder: v })}
              />
            </div>
          </Row>
        </div>
      </div>

      <div className="panel space-y-3 p-5">
        <p className="text-sm font-semibold">Instruments</p>
        <div className="flex gap-2">
          <Input
            placeholder="Add instrument (e.g. XAUUSD)"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = instrument.trim().toUpperCase();
                if (v && !settings.instruments.includes(v)) void saveSettings({ instruments: [...settings.instruments, v] });
                setInstrument("");
              }
            }}
          />
          <Button
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              const v = instrument.trim().toUpperCase();
              if (!v) return;
              if (!settings.instruments.includes(v)) void saveSettings({ instruments: [...settings.instruments, v] });
              setInstrument("");
              toast.success("Instrument added");
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {settings.instruments.map((i) => (
            <button
              key={i}
              onClick={() => void saveSettings({ instruments: settings.instruments.filter((x) => x !== i) })}
              className="group flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {i}
              <X className="size-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      <div className="panel space-y-2 p-5 text-sm text-muted-foreground">
        <p className="text-sm font-semibold text-foreground">App info</p>
        <p>Trade Vault v1.0.0 · local-only journal</p>
        <p>Platform: {getPlatform()} {isStandalone() ? "(installed)" : ""}</p>
        <p>File System Access API: {supportsFileSystemAccess() ? "available" : "not supported — downloads used instead"}</p>
        <p>No account, no cloud sync, no telemetry. Your data never leaves this device.</p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
