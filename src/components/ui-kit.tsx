import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "profit" | "loss";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel group relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/70" />}
      </div>
      <p
        className={cn(
          "num mt-2 text-2xl font-bold tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-[var(--gradient-hero)] text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel h-24 animate-pulse bg-surface-2/40" />
      ))}
    </div>
  );
}
