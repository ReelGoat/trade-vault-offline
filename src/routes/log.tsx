import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlusCircle, Pencil } from "lucide-react";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { emptyTrade, TradeForm } from "@/components/trade/TradeForm";
import { LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { formatDate, formatSigned, pnlClass } from "@/lib/format";
import { safeDate } from "@/services/analytics";
import { cn } from "@/lib/utils";
import type { Trade } from "@/services/types";

type LogSearch = { id?: string; date?: string };

export const Route = createFileRoute("/log")({
  validateSearch: (search: Record<string, unknown>): LogSearch => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
    date: typeof search["date"] === "string" ? search["date"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log a Trade — Trade Vault" },
      {
        name: "description",
        content:
          "Log trades with automatic gross/net P&L, R multiple, rule checklist, emotions and screenshots — stored locally.",
      },
      { property: "og:title", content: "Log a Trade — Trade Vault" },
      { property: "og:description", content: "Premium offline trade entry with automatic P&L and R multiple." },
    ],
  }),
  component: LogPage,
});

function LogPage() {
  const hydrated = useVaultBoot();
  const search = useSearch({ from: "/log" });
  const { trades, settings } = useVault();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  const activeId = selectedId ?? search.id ?? null;

  const draft = useMemo(
    () => emptyTrade(search.date ? new Date(search.date) : undefined),
    [search.date, draftKey],
  );

  const initial: Trade = useMemo(() => {
    const found = trades.find((t) => t.id === activeId);
    return found ?? draft;
  }, [activeId, trades, draft]);

  const sorted = [...trades].sort(
    (a, b) => (safeDate(b.entryDate)?.getTime() ?? 0) - (safeDate(a.entryDate)?.getTime() ?? 0),
  );

  if (!hydrated) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-6">
      <SectionTitle
        title={activeId ? "Edit trade" : "Log a new trade"}
        subtitle="Everything is calculated automatically and stored on this device"
        right={
          activeId ? (
            <button
              onClick={() => {
                setSelectedId(null);
                setDraftKey((k) => k + 1);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-semibold"
            >
              <PlusCircle className="size-4" /> New
            </button>
          ) : undefined
        }
      />

      <TradeForm
        key={initial.id}
        initial={initial}
        onSaved={(t) => setSelectedId(t.id)}
        onDeleted={() => {
          setSelectedId(null);
          setDraftKey((k) => k + 1);
        }}
      />

      {sorted.length > 0 && (
        <section>
          <SectionTitle title="All trades" subtitle={`${sorted.length} entries in your vault`} />
          <div className="panel divide-y divide-border overflow-hidden p-0">
            {sorted.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedId(t.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                  t.id === activeId && "bg-secondary/60",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {t.symbol}{" "}
                    <span
                      className={cn(
                        "ml-1 text-xs font-medium uppercase",
                        t.direction === "long" ? "text-profit" : "text-loss",
                      )}
                    >
                      {t.direction}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(t.entryDate)} · {t.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={cn("num text-sm font-bold", pnlClass(t.netPnl))}>
                    {t.status === "open" ? "—" : formatSigned(t.netPnl, settings.baseCurrency)}
                  </span>
                  <Pencil className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
