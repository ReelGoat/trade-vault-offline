import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TradeForm } from "./TradeForm";
import type { Trade } from "@/services/types";

export function TradeDrawer({
  trade,
  open,
  onOpenChange,
}: {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-background/95 backdrop-blur-xl sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{trade?.symbol ? `Edit ${trade.symbol}` : "Trade"}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-10">
          {trade && (
            <TradeForm
              initial={trade}
              compact
              onSaved={() => onOpenChange(false)}
              onDeleted={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
