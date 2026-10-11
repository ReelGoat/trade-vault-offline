import { useEffect } from "react";
import { useVault } from "@/store/vault";
import {
  hydrateSyncMeta,
  loadSyncConfig,
  markLocalChange,
  pushToGithub,
  useSyncStatus,
} from "@/services/github-sync";

/** Mounted once in the app shell: tracks local edits, auto-syncs, flushes the offline queue. */
export function useGithubSyncBoot() {
  useEffect(() => {
    hydrateSyncMeta();
    let ready = false;

    const unsub = useVault.subscribe((s, prev) => {
      if (!s.hydrated) return;
      if (!prev.hydrated) {
        ready = true;
        const cfg = loadSyncConfig();
        if (cfg.autoSync && cfg.token && navigator.onLine) {
          void pushToGithub(cfg).then(() => useVault.getState().load()).catch(() => {});
        }
        return;
      }
      if (!ready || useSyncStatus.getState().status === "syncing") return;
      if (s.trades !== prev.trades || s.setups !== prev.setups || s.rules !== prev.rules || s.settings !== prev.settings) {
        markLocalChange();
      }
    });

    const onOnline = () => {
      const cfg = loadSyncConfig();
      if (cfg.token && useSyncStatus.getState().pendingPush) {
        void pushToGithub(cfg).then(() => useVault.getState().load()).catch(() => {});
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, []);
}
