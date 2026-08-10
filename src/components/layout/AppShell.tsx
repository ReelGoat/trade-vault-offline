import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  BarChart3,
  Layers,
  ShieldCheck,
  Settings2,
  DatabaseBackup,
  Menu,
  X,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/log", label: "Log", icon: PlusCircle },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analysis", label: "Analysis", icon: BarChart3 },
] as const;

const secondaryNav = [
  { to: "/setups", label: "Setups", icon: Layers },
  { to: "/rules", label: "Rules", icon: ShieldCheck },
  { to: "/backup", label: "Backup", icon: DatabaseBackup },
  { to: "/settings", label: "Settings", icon: Settings2 },
] as const;

function useOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline;
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: Boolean(exact) }}
      onClick={onClick}
      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-foreground"
    >
      <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-300 group-data-[status=active]:h-5" />
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const offline = useOffline();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl lg:flex">
        <Brand />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
          {primaryNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Manage
          </p>
          {secondaryNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="px-5 pb-5 text-[11px] text-muted-foreground/70">
          Local-only · v1.0.0
        </div>
      </aside>

      {/* Mobile slide-over */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between pr-3">
            <Brand />
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
            {[...primaryNav, ...secondaryNav].map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
            ))}
          </nav>
        </div>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <span className="truncate text-sm font-medium text-muted-foreground">
              {[...primaryNav, ...secondaryNav].find((n) =>
                n.to === "/" ? pathname === "/" : pathname.startsWith(n.to),
              )?.label ?? "Trade Vault"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {offline && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                <WifiOff className="size-3" /> Offline ready
              </span>
            )}
            <Link
              to="/log"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            >
              <PlusCircle className="size-4" />
              <span className="hidden sm:inline">New trade</span>
            </Link>
          </div>
        </header>

        <main
          key={pathname}
          className="animate-rise mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {[...primaryNav, { to: "/settings", label: "More", icon: Settings2 }].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="group relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <span className="absolute top-0 h-[2px] w-0 rounded-full bg-primary transition-all duration-300 group-data-[status=active]:w-8" />
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-5 py-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--gradient-hero)] text-primary shadow-[var(--shadow-glow)]">
        <BarChart3 className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-bold tracking-tight">Trade Vault</span>
        <span className="block text-[11px] text-muted-foreground">Offline trade journal</span>
      </span>
    </Link>
  );
}
