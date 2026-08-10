import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { uid } from "@/services/storage";
import { groupBy } from "@/services/analytics";
import { EmptyState, LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { formatPercent, formatSigned, pnlClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import type { Setup } from "@/services/types";

export const Route = createFileRoute("/setups")({
  head: () => ({
    meta: [
      { title: "Trading Setups — Trade Vault" },
      { name: "description", content: "Define, score and manage your trading setups with criteria checklists and live performance stats." },
      { property: "og:title", content: "Trading Setups — Trade Vault" },
      { property: "og:description", content: "Track which setups actually make you money." },
    ],
  }),
  component: SetupsPage,
});

const blank = (): Setup => {
  const now = new Date().toISOString();
  return { id: uid(), name: "", description: "", criteria: [], isActive: true, createdAt: now, updatedAt: now };
};

function SetupsPage() {
  const hydrated = useVaultBoot();
  const { setups, trades, settings, saveSetup, removeSetup } = useVault();
  const [editing, setEditing] = useState<Setup | null>(null);
  const [criterion, setCriterion] = useState("");

  const stats = groupBy(trades, (t) => t.setupName ?? "No setup");

  if (!hydrated) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Setups"
        subtitle="Your repeatable trade patterns"
        right={
          <Button onClick={() => setEditing(blank())} className="gap-2">
            <Plus className="size-4" /> New setup
          </Button>
        }
      />

      {setups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No setups yet"
          description="Create your first setup to attach it to trades and see which patterns actually perform."
          action={
            <Button onClick={() => setEditing(blank())} className="mt-2 gap-2">
              <Plus className="size-4" /> Create setup
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {setups.map((s) => {
            const stat = stats.find((g) => g.key === s.name);
            return (
              <div key={s.id} className="panel space-y-3 p-5 transition-transform hover:-translate-y-0.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name || "Untitled setup"}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{s.description || "No description"}</p>
                  </div>
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(v) => saveSetup({ ...s, isActive: v, updatedAt: new Date().toISOString() })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Trades" value={String(stat?.trades ?? 0)} />
                  <Mini label="Win %" value={formatPercent(stat?.winRate ?? 0, 0)} />
                  <Mini
                    label="Net P&L"
                    value={formatSigned(stat?.netPnl ?? 0, settings.baseCurrency)}
                    className={pnlClass(stat?.netPnl ?? 0)}
                  />
                </div>
                {s.criteria.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {s.criteria.slice(0, 3).map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(s)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <DeleteButton
                    label="setup"
                    onConfirm={async () => {
                      await removeSetup(s.id);
                      toast.success("Setup deleted");
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing?.name ? "Edit setup" : "New setup"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-10">
              <Input
                placeholder="Setup name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <Textarea
                rows={4}
                placeholder="Describe the pattern and context"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Add criterion"
                  value={criterion}
                  onChange={(e) => setCriterion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && criterion.trim()) {
                      setEditing({ ...editing, criteria: [...editing.criteria, criterion.trim()] });
                      setCriterion("");
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!criterion.trim()) return;
                    setEditing({ ...editing, criteria: [...editing.criteria, criterion.trim()] });
                    setCriterion("");
                  }}
                >
                  Add
                </Button>
              </div>
              <ul className="space-y-1.5">
                {editing.criteria.map((c) => (
                  <li key={c} className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{c}</span>
                    <button
                      aria-label={`Remove ${c}`}
                      onClick={() => setEditing({ ...editing, criteria: editing.criteria.filter((x) => x !== c) })}
                      className="text-muted-foreground hover:text-loss"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={async () => {
                  if (!editing.name.trim()) {
                    toast.error("Setup name is required");
                    return;
                  }
                  await saveSetup({ ...editing, updatedAt: new Date().toISOString() });
                  toast.success("Setup saved");
                  setEditing(null);
                }}
              >
                Save setup
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("num text-sm font-bold", className)}>{value}</p>
    </div>
  );
}

export function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void | Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {label}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
