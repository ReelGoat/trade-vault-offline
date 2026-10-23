import { ArrowDownRight, ArrowUpRight, Eye } from "lucide-react";
import { calculate24hChange, type MarketAsset } from "@/api/marketData";
import { SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

interface WatchlistProps {
  assets?: MarketAsset[];
}

const defaultAssets: MarketAsset[] = [
  { symbol: "EURUSD", name: "Euro / US Dollar", currentPrice: 1.085, previousClose: 1.081 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", currentPrice: 1.264, previousClose: 1.268 },
  { symbol: "XAUUSD", name: "Gold / US Dollar", currentPrice: 2350.5, previousClose: 2325 },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", currentPrice: 64200, previousClose: 63000 },
];

function formatPrice(value: number) {
  const digits = value < 10 ? 4 : 2;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function Watchlist({ assets = defaultAssets }: WatchlistProps) {
  return (
    <section className="panel p-5">
      <SectionTitle
        title="Watchlist"
        subtitle="Reference prices with 24h change"
        right={<Eye className="size-4 text-muted-foreground/70" />}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Symbol</th>
              <th className="hidden px-3 py-2 sm:table-cell">Name</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">24h Change</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const change = calculate24hChange(asset.currentPrice, asset.previousClose);
              const isPositive = change >= 0;
              return (
                <tr
                  key={asset.symbol}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-3 py-2.5 text-sm font-semibold">{asset.symbol}</td>
                  <td className="hidden px-3 py-2.5 text-sm text-muted-foreground sm:table-cell">
                    {asset.name}
                  </td>
                  <td className="num px-3 py-2.5 text-right text-sm">{formatPrice(asset.currentPrice)}</td>
                  <td
                    className={cn(
                      "num px-3 py-2.5 text-right text-sm font-bold",
                      isPositive ? "text-profit" : "text-loss",
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      {isPositive ? (
                        <ArrowUpRight className="size-3.5" />
                      ) : (
                        <ArrowDownRight className="size-3.5" />
                      )}
                      {isPositive ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Watchlist;
