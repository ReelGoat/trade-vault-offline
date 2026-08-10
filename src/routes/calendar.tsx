import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, PlusCircle, Pencil } from "lucide-react";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { safeDate } from "@/services/analytics";
import { EmptyState, LoadingGrid, SectionTitle } from "@/components/ui-kit";
import { formatSigned, pnlClass, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TradeDrawer } from "@/components/trade/TradeDrawer";
import type { Trade } from "@/services/types";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "P&L Calendar — Trade Vault" },
      {
        name: "description",
        content: "A monthly trading calendar showing realized net P&L per day, trade counts and open positions.",
      },
      { property: "og:title", content: "P&L Calendar — Trade Vault" },
      { property: "og:description", content: "Scan your trading month at a glance with daily realized P&L." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const hydrated = useVaultBoot();
  const navigate = useNavigate();
  const { trades, settings } = useVault();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Trade | null>(null);

  const c = settings.baseCurrency;
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const grid = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, { pnl: number; closed: number; open: number }>();
    for (const t of trades) {
      const d = t.status === "closed" ? safeDate(t.exitDate) : safeDate(t.entryDate);
      if (!d) continue;
      const key = format(d, "yyyy-MM-dd");
      const prev = map.get(key) ?? { pnl: 0, closed: 0, open: 0 };
      if (t.status === "closed") map.set(key, { ...prev, pnl: prev.pnl + t.netPnl, closed: prev.closed + 1 });
      else map.set(key, { ...prev, open: prev.open + 1 });
    }
    return map;
  }, [trades]);

  const monthTotal = grid
    .filter((d) => isSameMonth(d, cursor))
    .reduce((s, d) => s + (byDay.get(format(d, "yyyy-MM-dd"))?.pnl ?? 0), 0);
  const monthTradeCount = grid
    .filter((d) => isSameMonth(d, cursor))
    .reduce((s, d) => {
      const v = byDay.get(format(d, "yyyy-MM-dd"));
      return s + (v ? v.closed + v.open : 0);
    }, 0);

  const dayTrades = selected
    ? trades.filter((t) => {
        const d = t.status === "closed" ? safeDate(t.exitDate) : safeDate(t.entryDate);
        return d ? isSameDay(d, selected) : false;
      })
    : [];

  if (!hydrated) return <LoadingGrid count={4} />;

  return (
    <div className="space-y-5">
      <SectionTitle
        title={format(cursor, "MMMM yyyy")}
        subtitle={`${monthTradeCount} trades · ${formatSigned(monthTotal, c)} realized`}
        right={
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Previous month"
              onClick={() => setCursor(subMonths(cursor, 1))}
              className="rounded-xl border border-border bg-secondary p-2 hover:border-primary/40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setCursor(new Date())}
              className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-semibold hover:border-primary/40"
            >
              Today
            </button>
            <button
              aria-label="Next month"
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="rounded-xl border border-border bg-secondary p-2 hover:border-primary/40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      />

      {monthTradeCount === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No trades this month"
          description="Nothing logged for this month yet. Add a trade or switch months to review past performance."
          action={
            <button
              onClick={() => navigate({ to: "/log" })}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="size-4" /> Log a trade
            </button>
          }
        />
      ) : null}

      <div className="panel p-3 sm:p-4">
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const data = byDay.get(key);
            const outside = !isSameMonth(day, cursor);
            const pnl = data?.pnl ?? 0;
            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={cn(
                  "group relative aspect-square rounded-xl border p-1.5 text-left transition-all duration-200 sm:p-2",
                  outside ? "opacity-35" : "",
                  data && data.closed > 0
                    ? pnl > 0
                      ? "border-profit/35 bg-profit/12 hover:border-profit"
                      : pnl < 0
                        ? "border-loss/35 bg-loss/12 hover:border-loss"
                        : "border-border bg-secondary/40"
                    : "border-border bg-secondary/25 hover:border-primary/40",
                )}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {format(day, "d")}
                </span>
                {data && data.closed > 0 && (
                  <span
                    className={cn(
                      "num absolute inset-x-1 bottom-4 truncate text-center text-[10px] font-bold sm:text-xs",
                      pnlClass(pnl),
                    )}
                  >
                    {formatSigned(pnl, c)}
                  </span>
                )}
                {data && (
                  <span className="absolute inset-x-1 bottom-1 text-center text-[9px] text-muted-foreground">
                    {data.closed > 0 ? `${data.closed} closed` : ""}
                    {data.open > 0 ? ` ${data.open} open` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-border bg-background/95 backdrop-blur-xl sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{selected ? format(selected, "EEEE, dd MMM yyyy") : ""}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-10">
            <button
              onClick={() =>
                navigate({ to: "/log", search: { date: selected?.toISOString() } })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="size-4" /> Add trade for this day
            </button>
            {dayTrades.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No trades recorded on this day.
              </p>
            ) : (
              dayTrades.map((t) => (
                <div key={t.id} className="panel p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {t.symbol}{" "}
                        <span className={cn("text-xs uppercase", t.direction === "long" ? "text-profit" : "text-loss")}>
                          {t.direction}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(t.entryDate, "HH:mm")} · {t.setupName ?? (t.strategy || "No setup")}
                      </p>
                    </div>
                    <p className={cn("num shrink-0 text-sm font-bold", pnlClass(t.netPnl))}>
                      {t.status === "open" ? "Open" : formatSigned(t.netPnl, c)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="num">{formatNumber(t.rMultiple, 2)}R</span>
                    <button
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 font-semibold text-foreground hover:border-primary/40"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <TradeDrawer trade={editing} open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
