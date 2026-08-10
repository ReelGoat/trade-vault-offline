import { format, isValid, parseISO } from "date-fns";

export function formatCurrency(value: number, currency = "USD", compact = false) {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
      notation: compact ? "compact" : "standard",
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

export function formatSigned(value: number, currency = "USD") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value, currency)}`;
}

export function formatPercent(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits);
}

export function formatDate(value?: string, pattern = "dd MMM yyyy") {
  if (!value) return "—";
  const d = parseISO(value);
  return isValid(d) ? format(d, pattern) : "—";
}

export function formatDateTime(value?: string) {
  return formatDate(value, "dd MMM yyyy · HH:mm");
}

/** value for <input type="datetime-local"> */
export function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isValid(d) ? d.toISOString() : undefined;
}

export function pnlClass(value: number) {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-muted-foreground";
}
