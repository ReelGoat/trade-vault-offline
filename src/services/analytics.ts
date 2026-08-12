import {
  format,
  parseISO,
  startOfMonth,
  isValid,
} from "date-fns";
import type { Trade } from "./types";

export function computePnl(input: {
  direction: "long" | "short";
  entryPrice: number;
  exitPrice?: number | undefined;
  quantity: number;
  fees: number;
  riskAmount: number;
  status: "open" | "closed";
}) {
  const { direction, entryPrice, exitPrice, quantity, fees, riskAmount, status } = input;
  if (status === "open" || exitPrice === undefined || Number.isNaN(exitPrice)) {
    return { grossPnl: 0, netPnl: 0, rMultiple: 0, returnPercent: 0 };
  }
  const diff = direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const grossPnl = diff * quantity;
  const netPnl = grossPnl - (fees || 0);
  const rMultiple = riskAmount > 0 ? netPnl / riskAmount : 0;
  const cost = Math.abs(entryPrice * quantity);
  const returnPercent = cost > 0 ? (netPnl / cost) * 100 : 0;
  return { grossPnl, netPnl, rMultiple, returnPercent };
}

export const safeDate = (value?: string): Date | null => {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

export const closedTrades = (trades: Trade[]) => trades.filter((t) => t.status === "closed");

export interface Kpis {
  totalNetPnl: number;
  totalGrossPnl: number;
  totalFees: number;
  winRate: number;
  lossRate: number;
  breakevenRate: number;
  wins: number;
  losses: number;
  breakeven: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgR: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  winStreak: number;
  lossStreak: number;
  totalTrades: number;
  openTrades: number;
  closedCount: number;
}

export function computeKpis(all: Trade[]): Kpis {
  const closed = closedTrades(all).sort(
    (a, b) => (safeDate(a.exitDate)?.getTime() ?? 0) - (safeDate(b.exitDate)?.getTime() ?? 0),
  );
  const wins = closed.filter((t) => t.netPnl > 0);
  const losses = closed.filter((t) => t.netPnl < 0);
  const breakeven = closed.filter((t) => t.netPnl === 0);
  const grossProfit = wins.reduce((s, t) => s + t.netPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
  const n = closed.length || 1;

  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  for (const t of closed) {
    equity += t.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  let winStreak = 0;
  let lossStreak = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if ((closed[i]?.netPnl ?? 0) > 0) winStreak++;
    else break;
  }
  for (let i = closed.length - 1; i >= 0; i--) {
    if ((closed[i]?.netPnl ?? 0) < 0) lossStreak++;
    else break;
  }

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  return {
    totalNetPnl: closed.reduce((s, t) => s + t.netPnl, 0),
    totalGrossPnl: closed.reduce((s, t) => s + t.grossPnl, 0),
    totalFees: all.reduce((s, t) => s + (t.fees || 0), 0),
    winRate,
    lossRate: closed.length ? (losses.length / closed.length) * 100 : 0,
    breakevenRate: closed.length ? (breakeven.length / closed.length) * 100 : 0,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    avgWin,
    avgLoss,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.netPnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.netPnl)) : 0,
    avgR: closed.reduce((s, t) => s + (t.rMultiple || 0), 0) / n,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancy: (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss,
    maxDrawdown,
    winStreak,
    lossStreak,
    totalTrades: all.length,
    openTrades: all.filter((t) => t.status === "open").length,
    closedCount: closed.length,
  };
}

export function equityCurve(all: Trade[], startingBalance: number) {
  const closed = closedTrades(all).sort(
    (a, b) => (safeDate(a.exitDate)?.getTime() ?? 0) - (safeDate(b.exitDate)?.getTime() ?? 0),
  );
  let equity = startingBalance;
  const points = [{ label: "Start", equity, index: 0 }];
  closed.forEach((t, i) => {
    equity += t.netPnl;
    const d = safeDate(t.exitDate);
    points.push({ label: d ? format(d, "dd MMM") : `#${i + 1}`, equity, index: i + 1 });
  });
  return points;
}

export function dailyPnl(all: Trade[]) {
  const map = new Map<string, { pnl: number; count: number }>();
  for (const t of closedTrades(all)) {
    const d = safeDate(t.exitDate) ?? safeDate(t.entryDate);
    if (!d) continue;
    const key = format(d, "yyyy-MM-dd");
    const prev = map.get(key) ?? { pnl: 0, count: 0 };
    map.set(key, { pnl: prev.pnl + t.netPnl, count: prev.count + 1 });
  }
  return map;
}

export function monthlyPnl(all: Trade[]) {
  const map = new Map<string, number>();
  for (const t of closedTrades(all)) {
    const d = safeDate(t.exitDate);
    if (!d) continue;
    const key = format(startOfMonth(d), "yyyy-MM");
    map.set(key, (map.get(key) ?? 0) + t.netPnl);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, pnl]) => ({ label: format(parseISO(`${key}-01`), "MMM yy"), pnl }));
}

export interface GroupStat {
  key: string;
  trades: number;
  netPnl: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgR: number;
}

export function buildGroupStat(list: Trade[], key: string): GroupStat {
  const winners = list.filter((t) => t.netPnl > 0);
  const losers = list.filter((t) => t.netPnl < 0);
  const flat = list.filter((t) => t.netPnl === 0);
  const grossProfit = winners.reduce((s, t) => s + t.netPnl, 0);
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.netPnl, 0));
  return {
    key,
    trades: list.length,
    netPnl: list.reduce((s, t) => s + t.netPnl, 0),
    wins: winners.length,
    losses: losers.length,
    breakeven: flat.length,
    winRate: list.length ? (winners.length / list.length) * 100 : 0,
    lossRate: list.length ? (losers.length / list.length) * 100 : 0,
    avgWin: winners.length ? grossProfit / winners.length : 0,
    avgLoss: losers.length ? grossLoss / losers.length : 0,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgR: list.reduce((s, t) => s + (t.rMultiple || 0), 0) / (list.length || 1),
  };
}

export function groupBy(all: Trade[], selector: (t: Trade) => string | string[]): GroupStat[] {
  const map = new Map<string, Trade[]>();
  for (const t of closedTrades(all)) {
    const raw = selector(t);
    const keys = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
    for (const k of keys.length ? keys : ["—"]) {
      map.set(k, [...(map.get(k) ?? []), t]);
    }
  }
  return [...map.entries()]
    .map(([key, list]) => buildGroupStat(list, key))
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function byDayOfWeek(all: Trade[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = names.map((label) => ({ label, pnl: 0, trades: 0 }));
  for (const t of closedTrades(all)) {
    const d = safeDate(t.exitDate);
    if (!d) continue;
    const b = buckets[d.getDay()];
    if (!b) continue;
    b.pnl += t.netPnl;
    b.trades += 1;
  }
  return order.map((i) => buckets[i]!).filter(Boolean);
}

export function byHourOfDay(all: Trade[]) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, "0")}:00`,
    pnl: 0,
    trades: 0,
  }));
  for (const t of closedTrades(all)) {
    const d = safeDate(t.entryDate);
    if (!d) continue;
    const b = buckets[d.getHours()];
    if (!b) continue;
    b.pnl += t.netPnl;
    b.trades += 1;
  }
  return buckets;
}

export function ruleComplianceStats(all: Trade[]) {
  const closed = closedTrades(all);
  const build = buildGroupStat;
  return [
    build(closed.filter((t) => t.followedRules), "Followed rules"),
    build(closed.filter((t) => !t.followedRules), "Broke rules"),
  ];
}
