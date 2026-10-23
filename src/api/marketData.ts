export interface MarketAsset {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
}

export function calculate24hChange(currentPrice: number, previousClose: number): number {
  if (!previousClose || previousClose === 0) return 0;
  return ((currentPrice - previousClose) / previousClose) * 100;
}
