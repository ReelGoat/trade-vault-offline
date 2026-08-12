import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { useVaultBoot } from "@/hooks/use-vault-boot";
import { useVault } from "@/store/vault";
import {
  byDayOfWeek,
  byHourOfDay,
  computeKpis,
  dailyPnl,
  equityCurve,
  groupBy,
  monthlyPnl,
  ruleComplianceStats,
  safeDate,
  type GroupStat,
} from "@/services/analytics";
import { EmptyState, LoadingGrid, SectionTitle, StatCard } from "@/components/ui-kit";
import { formatCurrency, formatNumber, formatPercent, formatSigned, pnlClass } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Trade } from "@/services/types";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Performance Analysis — Trade Vault" },
      {
        name: "description",
        content:
          "Deep trading analytics: expectancy, profit factor, drawdown, performance by setup, symbol, day and rule compliance.",
      },
      { property: "og:title", content: "Performance Analysis — Trade Vault" },
      { property: "og:description", content: "Every metric computed locally from your own trade journal." },
    ],
  }),
  component: AnalysisPage,
});

const chartStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    fontSize: 12,
  },
} as const;

function AnalysisPage() {
  const hydrated = useVaultBoot();
  const { trades, settings } = useVault();
  const c = settings.baseCurrency;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [symbol, setSymbol] = useState("");
  const [strategy, setStrategy] = useState("");
  const [setupId, setSetupId] = useState("");
  const [direction, setDirection] = useState("");
  const [tag, setTag] = useState("");
  const [outcome, setOutcome] = useState("");
  const [ruleFilter, setRuleFilter] = useState("");

  const filtered = useMemo(() => {
    return trades.filter((t: Trade) => {
      const d = safeDate(t.exitDate) ?? safeDate(t.entryDate);
      if (from && d && d < new Date(from)) return false;
      if (to && d && d > new Date(`${to}T23:59:59`)) return false;
      if (symbol && !t.symbol.toLowerCase().includes(symbol.toLowerCase())) return false;
      if (strategy && !t.strategy.toLowerCase().includes(strategy.toLowerCase())) return false;
      if (setupId && t.setupId !== setupId) return false;
      if (direction && t.direction !== direction) return false;
      if (tag && !t.tags.some((x) => x.toLowerCase().includes(tag.toLowerCase()))) return false;
      if (outcome === "win" && !(t.status === "closed" && t.netPnl > 0)) return false;
      if (outcome === "loss" && !(t.status === "closed" && t.netPnl < 0)) return false;
      if (outcome === "open" && t.status !== "open") return false;
      if (ruleFilter === "followed" && !t.followedRules) return false;
      if (ruleFilter === "broke" && t.followedRules) return false;
      return true;
    });
  }, [trades, from, to, symbol, strategy, setupId, direction, tag, outcome, ruleFilter]);

  const k = useMemo(() => computeKpis(filtered), [filtered]);
  const curve = useMemo(
    () => equityCurve(filtered, settings.accountStartingBalance),
    [filtered, settings.accountStartingBalance],
  );
  const daily = useMemo(
    () =>
      [...dailyPnl(filtered).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ label: format(new Date(day), "dd MMM"), pnl: v.pnl })),
    [filtered],
  );
  const monthly = useMemo(() => monthlyPnl(filtered), [filtered]);
  const bySymbol = useMemo(() => groupBy(filtered, (t) => t.symbol || "—"), [filtered]);
  const bySetup = useMemo(() => groupBy(filtered, (t) => t.setupName ?? "No setup"), [filtered]);
  const byStrategy = useMemo(() => groupBy(filtered, (t) => t.strategy || "No strategy"), [filtered]);
  const byDirection = useMemo(() => groupBy(filtered, (t) => t.direction), [filtered]);
  const byTag = useMemo(() => groupBy(filtered, (t) => (t.tags.length ? t.tags : ["Untagged"])), [filtered]);
  const dow = useMemo(() => byDayOfWeek(filtered), [filtered]);
  const hours = useMemo(() => byHourOfDay(filtered).filter((h) => h.trades > 0), [filtered]);
  const compliance = useMemo(() => ruleComplianceStats(filtered), [filtered]);

  const distribution = [
    { name: "Wins", value: k.wins, color: "var(--color-profit)" },
    { name: "Losses", value: k.losses, color: "var(--color-loss)" },
    { name: "Breakeven", value: k.breakeven, color: "var(--color-neutral)" },
  ].filter((d) => d.value > 0);

  if (!hydrated) return <LoadingGrid count={8} />;

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analysis data yet"
        description="Once you log and close trades, this page fills with KPIs, charts and breakdowns automatically."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Performance analysis" subtitle={`${filtered.length} trades in the current filter`} />

      <div className="panel grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
        <Filter label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Filter>
        <Filter label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Filter>
        <Filter label="Symbol">
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Any" />
        </Filter>
        <Filter label="Strategy">
          <Input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="Any" />
        </Filter>
        <Filter label="Tag">
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Any" />
        </Filter>
        <Filter label="Setup">
          <Select value={setupId} onChange={setSetupId}>
            <option value="">All setups</option>
            {useVault.getState().setups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Filter>
        <Filter label="Direction">
          <Select value={direction} onChange={setDirection}>
            <option value="">Both</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </Select>
        </Filter>
        <Filter label="Outcome">
          <Select value={outcome} onChange={setOutcome}>
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="open">Open</option>
          </Select>
        </Filter>
        <Filter label="Rules">
          <Select value={ruleFilter} onChange={setRuleFilter}>
            <option value="">All</option>
            <option value="followed">Followed</option>
            <option value="broke">Broken</option>
          </Select>
        </Filter>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setSymbol("");
              setStrategy("");
              setSetupId("");
              setDirection("");
              setTag("");
              setOutcome("");
              setRuleFilter("");
            }}
            className="h-10 w-full rounded-xl border border-border bg-secondary text-sm font-semibold hover:border-primary/40"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Net P&L" value={formatSigned(k.totalNetPnl, c)} tone={k.totalNetPnl >= 0 ? "profit" : "loss"} />
        <StatCard label="Gross P&L" value={formatSigned(k.totalGrossPnl, c)} />
        <StatCard label="Total fees" value={formatCurrency(k.totalFees, c)} />
        <StatCard label="Win rate" value={formatPercent(k.winRate)} hint={`${k.wins}W · ${k.losses}L · ${k.breakeven}BE`} />
        <StatCard label="Loss rate" value={formatPercent(k.lossRate)} />
        <StatCard label="Breakeven rate" value={formatPercent(k.breakevenRate)} />
        <StatCard label="Average win" value={formatCurrency(k.avgWin, c)} tone="profit" />
        <StatCard label="Average loss" value={formatCurrency(k.avgLoss, c)} tone="loss" />
        <StatCard label="Largest win" value={formatCurrency(k.largestWin, c)} tone="profit" />
        <StatCard label="Largest loss" value={formatCurrency(k.largestLoss, c)} tone="loss" />
        <StatCard label="Average R" value={`${formatNumber(k.avgR)}R`} />
        <StatCard label="Profit factor" value={k.profitFactor === Infinity ? "∞" : formatNumber(k.profitFactor)} />
        <StatCard label="Expectancy" value={formatCurrency(k.expectancy, c)} />
        <StatCard label="Max drawdown" value={formatCurrency(k.maxDrawdown, c)} tone="loss" />
        <StatCard label="Win streak" value={k.winStreak} tone="profit" />
        <StatCard label="Loss streak" value={k.lossStreak} tone="loss" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Equity curve">
          <LineChart data={curve}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Line type="monotone" dataKey="equity" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Daily net P&L">
          <BarChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {daily.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Monthly net P&L">
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {monthly.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Win / loss distribution">
          <PieChart>
            <Tooltip {...chartStyle} />
            <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {distribution.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>

        <ChartCard title="P&L by day of week">
          <BarChart data={dow}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {dow.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="P&L by hour of day">
          <BarChart data={hours}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {hours.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="P&L by symbol">
          <BarChart data={bySymbol.map((g) => ({ label: g.key, pnl: g.netPnl }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {bySymbol.map((g, i) => (
                <Cell key={i} fill={g.netPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="P&L by setup">
          <BarChart data={bySetup.map((g) => ({ label: g.key, pnl: g.netPnl }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {bySetup.map((g, i) => (
                <Cell key={i} fill={g.netPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="P&L by strategy">
          <BarChart data={byStrategy.map((g) => ({ label: g.key, pnl: g.netPnl }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {byStrategy.map((g, i) => (
                <Cell key={i} fill={g.netPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="P&L by direction">
          <BarChart data={byDirection.map((g) => ({ label: g.key, pnl: g.netPnl }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip {...chartStyle} formatter={(v: number) => formatCurrency(v, c)} />
            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
              {byDirection.map((g, i) => (
                <Cell key={i} fill={g.netPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <StatTable title="Performance by setup" rows={bySetup} currency={c} />
        <StatTable title="Performance by strategy" rows={byStrategy} currency={c} />
        <StatTable title="Performance by symbol" rows={bySymbol} currency={c} />
        <StatTable title="Performance by tag" rows={byTag} currency={c} />
        <StatTable title="Rule compliance" rows={compliance} currency={c} />
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="panel p-5">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatTable({ title, rows, currency }: { title: string; rows: GroupStat[]; currency: string }) {
  return (
    <div className="panel overflow-hidden p-0">
      <p className="border-b border-border px-5 py-4 text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">No closed trades yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 text-right font-semibold">Trades</th>
                <th className="px-3 py-2 text-right font-semibold">W / L / BE</th>
                <th className="px-3 py-2 text-right font-semibold">Win %</th>
                <th className="px-3 py-2 text-right font-semibold">Loss %</th>
                <th className="px-3 py-2 text-right font-semibold">Avg win</th>
                <th className="px-3 py-2 text-right font-semibold">Avg loss</th>
                <th className="px-3 py-2 text-right font-semibold">Gross loss</th>
                <th className="px-3 py-2 text-right font-semibold">PF</th>
                <th className="px-3 py-2 text-right font-semibold">Avg R</th>
                <th className="px-5 py-2 text-right font-semibold">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="max-w-[160px] truncate px-5 py-2.5 font-medium">{r.key}</td>
                  <td className="num px-3 py-2.5 text-right text-muted-foreground">{r.trades}</td>
                  <td className="num px-3 py-2.5 text-right">
                    <span className="text-profit">{r.wins}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-loss">{r.losses}</span>
                    <span className="text-muted-foreground"> / {r.breakeven}</span>
                  </td>
                  <td className="num px-3 py-2.5 text-right text-profit">{formatPercent(r.winRate, 0)}</td>
                  <td className="num px-3 py-2.5 text-right text-loss">{formatPercent(r.lossRate, 0)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(r.avgWin, currency)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(r.avgLoss, currency)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted-foreground">{formatCurrency(r.grossLoss, currency)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted-foreground">
                    {r.profitFactor === Infinity ? "∞" : formatNumber(r.profitFactor, 2)}
                  </td>
                  <td className={cn("num px-3 py-2.5 text-right", pnlClass(r.avgR))}>{formatNumber(r.avgR, 2)}</td>
                  <td className={cn("num px-5 py-2.5 text-right font-semibold", pnlClass(r.netPnl))}>
                    {formatSigned(r.netPnl, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
