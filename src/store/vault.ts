import { create } from "zustand";
import { storage, uid } from "@/services/storage";
import { defaultSettings } from "@/services/db";
import type { AppSettings, Rule, Setup, Trade } from "@/services/types";

interface VaultState {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  trades: Trade[];
  setups: Setup[];
  rules: Rule[];
  settings: AppSettings;
  load: () => Promise<void>;
  saveTrade: (trade: Trade) => Promise<void>;
  removeTrade: (id: string) => Promise<void>;
  duplicateTrade: (id: string) => Promise<void>;
  saveSetup: (setup: Setup) => Promise<void>;
  removeSetup: (id: string) => Promise<void>;
  saveRule: (rule: Rule) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useVault = create<VaultState>((set, get) => ({
  hydrated: false,
  loading: true,
  error: null,
  trades: [],
  setups: [],
  rules: [],
  settings: defaultSettings(),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [trades, setups, rules, settings] = await Promise.all([
        storage.listTrades(),
        storage.listSetups(),
        storage.listRules(),
        storage.getSettings(),
      ]);
      set({ trades, setups, rules, settings, hydrated: true, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false, hydrated: true });
    }
  },

  saveTrade: async (trade) => {
    await storage.putTrade(trade);
    const rest = get().trades.filter((t) => t.id !== trade.id);
    set({ trades: [...rest, trade] });
  },
  removeTrade: async (id) => {
    await storage.deleteTrade(id);
    set({ trades: get().trades.filter((t) => t.id !== id) });
  },
  duplicateTrade: async (id) => {
    const src = get().trades.find((t) => t.id === id);
    if (!src) return;
    const now = new Date().toISOString();
    const copy: Trade = { ...src, id: uid(), createdAt: now, updatedAt: now };
    await get().saveTrade(copy);
  },

  saveSetup: async (setup) => {
    await storage.putSetup(setup);
    set({ setups: [...get().setups.filter((s) => s.id !== setup.id), setup] });
  },
  removeSetup: async (id) => {
    await storage.deleteSetup(id);
    set({ setups: get().setups.filter((s) => s.id !== id) });
  },

  saveRule: async (rule) => {
    await storage.putRule(rule);
    set({ rules: [...get().rules.filter((r) => r.id !== rule.id), rule] });
  },
  removeRule: async (id) => {
    await storage.deleteRule(id);
    set({ rules: get().rules.filter((r) => r.id !== id) });
  },

  saveSettings: async (patch) => {
    const next = { ...get().settings, ...patch, updatedAt: new Date().toISOString() };
    await storage.putSettings(next);
    set({ settings: next });
  },

  clearAll: async () => {
    await storage.clearAll();
    await get().load();
  },
}));
