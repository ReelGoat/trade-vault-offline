import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  TrendingUp,
  Target,
  Activity,
  CalendarDays,
  BarChart3,
  PlusCircle,
  Gauge,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endOfMonth, isWithinInterval, startOfMonth } from "date-fns";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import { computeKpis, dailyPnl, equityCurve, safeDate } from "@/services/analytics";
import { EmptyState, LoadingGrid, SectionTitle, StatCard } from "@/components/ui-kit";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatSigned,
  pnlClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trade Vault Offline Trading Journal" },
      {
        name: "description",
        content:
          "Track P&L, win rate, expectancy and your equity curve in Trade Vault, a private offline-first trading journal.",
      },
      { property: "og:title", content: "Trade Vault — Offline Trading Journal" },
      {
        property: "og:description",
        content: "Premium local-first trade logging, calendar P&L and deep analysis. No account needed.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useVaultBoot();
  const { trades, settings } = useVault();

  const kpis = useMemo(() => computeKpis(trades), [trades]);
  const curve = useMemo(
    () => equityCurve(trades, settings.accountStartingBalance),
    [trades, settings.accountStartingBalance],
  );
  const daily = useMemo(() => dailyPnl(trades), [trades]);

  const monthPnl = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };
    return trades
      .filter((t) => t.status === "closed")
      .filter((t) => {
        const d = safeDate(t.exitDate);
        return d ? isWithinInterval(d, interval) : false;
      })
      .reduce((s, t) => s + t.netPnl, 0);
  }, [trades]);

  const days = [...daily.entries()].sort((a, b) => b[1].pnl - a[1].pnl);
  const bestDay = days.length ? days[0] : undefined;
  const losingDays = days.filter(([, v]) => v.pnl < 0);
  const worstDay = losingDays.length
    ? losingDays[losingDays.length - 1]
    : days.length
      ? days[days.length - 1]
      : undefined;
  const recent = [...trades]
    .sort((a, b) => (safeDate(b.entryDate)?.getTime() ?? 0) - (safeDate(a.entryDate)?.getTime() ?? 0))
    .slice(0, 6);

  const balance = settings.accountStartingBalance + kpis.totalNetPnl;
  const c = settings.baseCurrency;

  if (!hydrated) return <LoadingGrid count={8} />;

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6">
        <div className="absolute inset-0 -z-10 bg-[var(--gradient-hero)] opacity-60" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Account equity
            </p>
            <p className="num mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {formatCurrency(balance, c)}
            </p>
            <p className={cn("mt-1 text-sm font-medium", pnlClass(kpis.totalNetPnl))}>
              {formatSigned(kpis.totalNetPnl, c)} all-time · {formatSigned(monthPnl, c)} this month
            </p>
          </div>
          <Sparkles className="size-6 shrink-0 text-primary" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/log"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
          >
            <PlusCircle className="size-4" /> Add trade
          </Link>
          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40"
          >
            <CalendarDays className="size-4" /> Calendar
          </Link>
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40"
          >
            <BarChart3 className="size-4" /> Analysis
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net P&L"
          value={formatSigned(kpis.totalNetPnl, c)}
          tone={kpis.totalNetPnl >= 0 ? "profit" : "loss"}
          icon={TrendingUp}
          hint={`${kpis.closedCount} closed trades`}
        />
        <StatCard label="Win rate" value={formatPercent(kpis.winRate)} icon={Target} hint={`${kpis.wins}W / ${kpis.losses}L`} />
        <StatCard
          label="Profit factor"
          value={kpis.profitFactor === Infinity ? "∞" : formatNumber(kpis.profitFactor)}
          icon={Gauge}
        />
        <StatCard label="Expectancy" value={formatCurrency(kpis.expectancy, c)} icon={Activity} hint="per trade" />
        <StatCard label="Starting balance" value={formatCurrency(settings.accountStartingBalance, c)} icon={Wallet} />
        <StatCard label="Open trades" value={kpis.openTrades} icon={ArrowUpRight} />
        <StatCard
          label="Best day"
          value={bestDay ? formatSigned(bestDay[1].pnl, c) : "—"}
          hint={bestDay ? formatDate(bestDay[0]) : "No data"}
          tone="profit"
          icon={ArrowUpRight}
        />
        <StatCard
          label="Worst day"
          value={worstDay ? formatSigned(worstDay[1].pnl, c) : "—"}
          hint={
            worstDay
              ? `${formatDate(worstDay[0])} · ${worstDay[1].count} trade${worstDay[1].count === 1 ? "" : "s"}`
              : "No data"
          }
          tone="loss"
          icon={ArrowDownRight}
        />
      </div>

      <section className="panel p-5">
        <SectionTitle title="Equity curve" subtitle="Cumulative balance from closed trades" />
        {curve.length <= 1 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Close your first trade to see the curve build.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v, c)}
                />
                <Area type="monotone" dataKey="equity" stroke="var(--color-primary)" strokeWidth={2} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Recent trades"
          subtitle="Your latest journal entries"
          right={
            <Link to="/analysis" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        />
        {recent.length === 0 ? (
          <EmptyState
            icon={PlusCircle}
            title="No trades yet"
            description="Log your first trade to unlock stats, calendar P&L and full performance analysis."
            action={
              <Link
                to="/log"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <PlusCircle className="size-4" /> Log a trade
              </Link>
            }
          />
        ) : (
          <div className="panel divide-y divide-border overflow-hidden p-0">
            {recent.map((t) => (
              <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold",
                      t.direction === "long" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss",
                    )}
                  >
                    {t.direction === "long" ? "L" : "S"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(t.entryDate)} · {t.setupName ?? (t.strategy || "No setup")}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {t.status === "open" ? (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      Open
                    </span>
                  ) : (
                    <>
                      <p className={cn("num text-sm font-bold", pnlClass(t.netPnl))}>
                        {formatSigned(t.netPnl, c)}
                      </p>
                      <p className="num text-[11px] text-muted-foreground">
                        {formatNumber(t.rMultiple, 2)}R
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
