export type Direction = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface RuleCheckItem {
  ruleId: string;
  name: string;
  checked: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  entryDate: string;
  exitDate?: string | undefined;
  entryPrice: number;
  exitPrice?: number | undefined;
  quantity: number;
  positionSize: number;
  fees: number;
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  rewardAmount: number;
  rMultiple: number;
  status: TradeStatus;
  strategy: string;
  setupId?: string | undefined;
  setupName?: string | undefined;
  tags: string[];
  notes: string;
  emotionBeforeTrade: string;
  emotionAfterTrade: string;
  followedRules: boolean;
  ruleChecklist: RuleCheckItem[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Setup {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleCategory = "risk" | "entry" | "exit" | "psychology" | "confirmation";

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  accountStartingBalance: number;
  defaultRiskPercent: number;
  baseCurrency: string;
  timezone: string;
  defaultCommission: number;
  instruments: string[];
  theme: "dark" | "light";
  backupReminder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupPayload {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  settings: AppSettings | null;
  trades: Trade[];
  setups: Setup[];
  rules: Rule[];
}
