import { CheckCircle2, CloudOff, Loader2, AlertTriangle, Github } from "lucide-react";
import { useSyncStatus } from "@/services/github-sync";
import { cn } from "@/lib/utils";

const MAP = {
  synced: { label: "Synced", icon: CheckCircle2, cls: "text-profit" },
  syncing: { label: "Syncing...", icon: Loader2, cls: "text-primary" },
  dirty: { label: "Unsaved Local Changes", icon: CloudOff, cls: "text-neutral" },
  error: { label: "Error / Invalid Token", icon: AlertTriangle, cls: "text-loss" },
  idle: { label: "Not synced", icon: Github, cls: "text-muted-foreground" },
} as const;

export function SyncStatusBadge({ compact }: { compact?: boolean }) {
  const { status, message } = useSyncStatus();
  const m = MAP[status];
  return (
    <span
      title={message || m.label}
      className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
    >
      <m.icon className={cn("size-3", m.cls, status === "syncing" && "animate-spin")} />
      <span className={cn(compact && "hidden md:inline")}>{m.label}</span>
    </span>
  );
}
