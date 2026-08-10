import { useEffect } from "react";
import { useVault } from "@/store/vault";

export function useVaultBoot() {
  const load = useVault((s) => s.load);
  const hydrated = useVault((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) void load();
  }, [hydrated, load]);
  return hydrated;
}
