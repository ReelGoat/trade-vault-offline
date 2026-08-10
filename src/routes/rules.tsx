import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { uid } from "@/services/storage";
import { ruleComplianceStats } from "@/services/analytics";
import { EmptyState, LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { formatPercent, formatSigned, pnlClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DeleteButton } from "./setups";
import type { Rule, RuleCategory } from "@/services/types";

const CATEGORIES: RuleCategory[] = ["risk", "entry", "exit", "psychology", "confirmation"];

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Trading Rules — Trade Vault" },
      { name: "description", content: "Build your trading rulebook and measure performance when you follow rules versus break them." },
      { property: "og:title", content: "Trading Rules — Trade Vault" },
      { property: "og:description", content: "Discipline you can measure, stored entirely on your device." },
    ],
  }),
  component: RulesPage,
});

const blank = (): Rule => {
  const now = new Date().toISOString();
  return { id: uid(), name: "", description: "", category: "risk", isActive: true, createdAt: now, updatedAt: now };
};

function RulesPage() {
  const hydrated = useVaultBoot();
  const { rules, trades, settings, saveRule, removeRule } = useVault();
  const [editing, setEditing] = useState<Rule | null>(null);
  const compliance = ruleComplianceStats(trades);

  if (!hydrated) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Rules"
        subtitle="Your trading rulebook and compliance stats"
        right={
          <Button onClick={() => setEditing(blank())} className="gap-2">
            <Plus className="size-4" /> New rule
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {compliance.map((r) => (
          <div key={r.key} className="panel p-5">
            <p className="text-sm font-semibold">{r.key}</p>
            <p className={cn("num mt-1 text-2xl font-bold", pnlClass(r.netPnl))}>
              {formatSigned(r.netPnl, settings.baseCurrency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.trades} trades · {formatPercent(r.winRate, 0)} win rate
            </p>
          </div>
        ))}
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No rules yet"
          description="Add rules to build a pre-trade checklist and measure whether discipline pays off."
          action={
            <Button onClick={() => setEditing(blank())} className="mt-2 gap-2">
              <Plus className="size-4" /> Create rule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((r) => (
            <div key={r.id} className="panel space-y-3 p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {r.category}
                  </span>
                </div>
                <Switch
                  checked={r.isActive}
                  onCheckedChange={(v) => saveRule({ ...r, isActive: v, updatedAt: new Date().toISOString() })}
                />
              </div>
              <p className="line-clamp-3 text-xs text-muted-foreground">{r.description || "No description"}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(r)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <DeleteButton
                  label="rule"
                  onConfirm={async () => {
                    await removeRule(r.id);
                    toast.success("Rule deleted");
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background/95 backdrop-blur-xl sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing?.name ? "Edit rule" : "New rule"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-10">
              <Input
                placeholder="Rule name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value as RuleCategory })}
                className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Textarea
                rows={4}
                placeholder="Why does this rule exist?"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={async () => {
                  if (!editing.name.trim()) {
                    toast.error("Rule name is required");
                    return;
                  }
                  await saveRule({ ...editing, updatedAt: new Date().toISOString() });
                  toast.success("Rule saved");
                  setEditing(null);
                }}
              >
                Save rule
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
