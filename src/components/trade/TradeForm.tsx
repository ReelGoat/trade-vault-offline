import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Copy, Save, Paperclip, X } from "lucide-react";
import { useVault } from "@/store/vault";
import { uid } from "@/services/storage";
import type { Direction, Trade, TradeStatus, Attachment } from "@/services/types";
import { fromLocalInput, pnlClass, toLocalInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EMOTIONS = ["Calm", "Confident", "Neutral", "Anxious", "Greedy", "Fearful", "Frustrated"];

export function emptyTrade(date?: Date): Trade {
  const now = new Date().toISOString();
  return {
    id: uid(),
    symbol: "",
    direction: "long",
    entryDate: (date ?? new Date()).toISOString(),
    exitDate: undefined,
    entryPrice: 0,
    exitPrice: undefined,
    quantity: 1,
    positionSize: 0,
    fees: 0,
    grossPnl: 0,
    netPnl: 0,
    riskAmount: 0,
    rewardAmount: 0,
    rMultiple: 0,
    status: "closed",
    strategy: "",
    setupId: undefined,
    setupName: undefined,
    tags: [],
    notes: "",
    emotionBeforeTrade: "",
    emotionAfterTrade: "",
    followedRules: true,
    ruleChecklist: [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TradeForm({
  initial,
  onSaved,
  onDeleted,
  compact,
}: {
  initial: Trade;
  onSaved?: (t: Trade) => void;
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const { setups, rules, settings, saveTrade, removeTrade, duplicateTrade, trades } = useVault();
  const [form, setForm] = useState<Trade>(initial);
  const [tagInput, setTagInput] = useState("");
  const isExisting = trades.some((t) => t.id === initial.id);

  useEffect(() => {
    setForm(initial);
  }, [initial.id]);

  const activeRules = useMemo(() => rules.filter((r) => r.isActive), [rules]);

  useEffect(() => {
    if (form.ruleChecklist.length === 0 && activeRules.length > 0 && !isExisting) {
      setForm((f) => ({
        ...f,
        ruleChecklist: activeRules.map((r) => ({ ruleId: r.id, name: r.name, checked: false })),
      }));
    }
  }, [activeRules.length]);

  const isBreakEven =
    form.status === "closed" && form.netPnl === 0 && form.grossPnl === 0;

  const set = <K extends keyof Trade>(key: K, value: Trade[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const warnings: string[] = [];
  if (form.status === "closed" && !isBreakEven && (!form.exitDate || form.exitPrice === undefined))
    warnings.push("Closed trades need both an exit date and an exit price.");
  if (form.status === "closed" && isBreakEven && !form.exitDate)
    warnings.push("Break-even trades need an exit date.");
  if (form.exitDate && new Date(form.exitDate) < new Date(form.entryDate))
    warnings.push("Exit date is before the entry date.");
  if (!form.symbol.trim()) warnings.push("Symbol is required.");
  if (form.quantity <= 0) warnings.push("Quantity must be greater than zero.");

  const blocking = !form.symbol.trim() || form.quantity <= 0;

  const handleSave = async () => {
    if (blocking) {
      toast.error(warnings[0] ?? "Please complete the required fields");
      return;
    }
    const next: Trade = {
      ...form,
      symbol: form.symbol.trim().toUpperCase(),
      positionSize: Math.abs(form.entryPrice * form.quantity),
      grossPnl: form.status === "open" ? 0 : form.grossPnl,
      netPnl: form.status === "open" ? 0 : form.netPnl,
      rMultiple: form.status === "open" ? 0 : form.rMultiple,
      setupName: setups.find((s) => s.id === form.setupId)?.name,
      followedRules:
        form.ruleChecklist.length > 0
          ? form.ruleChecklist.every((r) => r.checked)
          : form.followedRules,
      updatedAt: new Date().toISOString(),
    };
    await saveTrade(next);
    toast.success(isExisting ? "Trade updated" : "Trade saved locally");
    onSaved?.(next);
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!form.tags.includes(value)) set("tags", [...form.tags, value]);
    setTagInput("");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      if (file.size > 3_000_000) {
        toast.error(`${file.name} is larger than 3 MB and was skipped`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      next.push({
        id: uid(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        createdAt: new Date().toISOString(),
      });
    }
    set("attachments", [...form.attachments, ...next]);
  };

  return (
    <div className="space-y-5">
      <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <div className="panel space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Symbol">
              <Input
                value={form.symbol}
                list="instrument-list"
                onChange={(e) => set("symbol", e.target.value)}
                placeholder="EURUSD"
                className="uppercase"
              />
              <datalist id="instrument-list">
                {settings.instruments.map((i) => (
                  <option key={i} value={i} />
                ))}
              </datalist>
            </Field>
            <Field label="Strategy">
              <Input
                value={form.strategy}
                onChange={(e) => set("strategy", e.target.value)}
                placeholder="Breakout"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Direction">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                {(["long", "short"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("direction", d)}
                    className={cn(
                      "rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-200",
                      form.direction === d
                        ? d === "long"
                          ? "bg-profit/20 text-profit"
                          : "bg-loss/20 text-loss"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Status">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                {(["open", "closed"] as TradeStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={cn(
                      "rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-200",
                      form.status === s
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Entry date">
              <Input
                type="datetime-local"
                value={toLocalInput(form.entryDate)}
                onChange={(e) =>
                  set("entryDate", fromLocalInput(e.target.value) ?? form.entryDate)
                }
              />
            </Field>
            <Field label="Exit date">
              <Input
                type="datetime-local"
                value={toLocalInput(form.exitDate)}
                onChange={(e) => set("exitDate", fromLocalInput(e.target.value))}
              />
            </Field>
            <Field label="Entry price">
              <Input
                type="number"
                step="any"
                value={form.entryPrice}
                onChange={(e) => set("entryPrice", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Exit price">
              <Input
                type="number"
                step="any"
                value={form.exitPrice ?? ""}
                onChange={(e) =>
                  set("exitPrice", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                step="any"
                min={0}
                value={form.quantity}
                onChange={(e) => set("quantity", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Fees / commission">
              <Input
                type="number"
                step="any"
                value={form.fees}
                onChange={(e) => set("fees", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Risk amount" hint="Used for R multiple">
              <Input
                type="number"
                step="any"
                value={form.riskAmount}
                onChange={(e) => set("riskAmount", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Target reward">
              <Input
                type="number"
                step="any"
                value={form.rewardAmount}
                onChange={(e) => set("rewardAmount", Number(e.target.value) || 0)}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trade results
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Gross P&L (${settings.baseCurrency})`}>
                <Input
                  type="number"
                  step="any"
                  value={form.grossPnl}
                  onChange={(e) => set("grossPnl", Number(e.target.value) || 0)}
                />
              </Field>
              <Field label={`Net P&L (${settings.baseCurrency})`}>
                <Input
                  type="number"
                  step="any"
                  value={form.netPnl}
                  onChange={(e) => set("netPnl", Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="R multiple">
                <Input
                  type="number"
                  step="any"
                  value={form.rMultiple}
                  onChange={(e) => set("rMultiple", Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Return %">
                <Input
                  type="number"
                  step="any"
                  value={form.returnPercent ?? ""}
                  onChange={(e) =>
                    set("returnPercent", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Risk / reward" hint="Reward per 1 risk, e.g. 2.5">
                <Input
                  type="number"
                  step="any"
                  value={form.riskRewardRatio ?? ""}
                  onChange={(e) =>
                    set(
                      "riskRewardRatio",
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Break even</p>
                <p className="text-[11px] text-muted-foreground">
                  Marks the trade closed and zeroes P&L, R and return
                </p>
              </div>
              <button
                type="button"
                aria-pressed={isBreakEven}
                onClick={() =>
                  setForm((f) =>
                    isBreakEven
                      ? f
                      : {
                          ...f,
                          status: "closed",
                          exitDate: f.exitDate || new Date().toISOString(),
                          grossPnl: 0,
                          netPnl: 0,
                          rMultiple: 0,
                          returnPercent: 0,
                        },
                  )
                }
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
                  isBreakEven
                    ? "bg-neutral/20 text-neutral"
                    : "border border-border bg-background/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {isBreakEven ? "Break even" : "Set break even"}
              </button>
            </div>
          </div>


          <div className="panel space-y-4 p-5">
            <Field label="Setup">
              <select
                value={form.setupId ?? ""}
                onChange={(e) => set("setupId", e.target.value || undefined)}
                className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No setup</option>
                {setups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tags">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => set("tags", form.tags.filter((t) => t !== tag))}
                      className="group flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {tag}
                      <X className="size-3 opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Emotion before">
                <EmotionPicker
                  value={form.emotionBeforeTrade}
                  onChange={(v) => set("emotionBeforeTrade", v)}
                />
              </Field>
              <Field label="Emotion after">
                <EmotionPicker
                  value={form.emotionAfterTrade}
                  onChange={(v) => set("emotionAfterTrade", v)}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Rule checklist
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Followed rules
              <Switch
                checked={
                  form.ruleChecklist.length
                    ? form.ruleChecklist.every((r) => r.checked)
                    : form.followedRules
                }
                onCheckedChange={(checked) => {
                  set("followedRules", checked);
                  set(
                    "ruleChecklist",
                    form.ruleChecklist.map((r) => ({ ...r, checked })),
                  );
                }}
              />
            </div>
          </div>
          {form.ruleChecklist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active rules yet — add rules to build a pre-trade checklist.
            </p>
          ) : (
            <ul className="space-y-2">
              {form.ruleChecklist.map((item) => (
                <li key={item.ruleId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm transition-colors hover:border-primary/40">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={item.checked}
                      onChange={(e) =>
                        set(
                          "ruleChecklist",
                          form.ruleChecklist.map((r) =>
                            r.ruleId === item.ruleId ? { ...r, checked: e.target.checked } : r,
                          ),
                        )
                      }
                    />
                    <span className={cn(item.checked ? "text-foreground" : "text-muted-foreground")}>
                      {item.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel space-y-4 p-5">
          <Field label="Notes">
            <Textarea
              rows={5}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="What did you see? What would you do differently?"
            />
          </Field>
          <Field label="Screenshots" hint="Stored locally in your browser database">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <Paperclip className="size-4" />
              Attach images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            {form.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.attachments.map((a) => (
                  <div key={a.id} className="group relative">
                    <img
                      src={a.dataUrl}
                      alt={a.name}
                      className="size-20 rounded-xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        set("attachments", form.attachments.filter((x) => x.id !== a.id))
                      }
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="panel space-y-1 border-destructive/30 p-4 text-sm text-loss">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} className="gap-2">
          <Save className="size-4" /> {isExisting ? "Update trade" : "Save trade"}
        </Button>
        {isExisting && (
          <>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={async () => {
                await duplicateTrade(form.id);
                toast.success("Trade duplicated");
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the trade from your local vault. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await removeTrade(form.id);
                      toast.success("Trade deleted");
                      onDeleted?.();
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("num mt-1 text-base font-bold", tone === undefined ? "" : pnlClass(tone))}>
        {value}
      </p>
    </div>
  );
}

function EmotionPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-background/50 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">Not set</option>
      {EMOTIONS.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  );
}
