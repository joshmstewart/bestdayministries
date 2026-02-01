import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PricingTier {
  id: string;
  min_quantity: number;
  price_per_unit: number;
}

interface CoffeeTiersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  costPrice: number;
  sellingPrice: number;
  tiers: PricingTier[];
}

export function CoffeeTiersDialog({
  open,
  onOpenChange,
  productName,
  costPrice,
  sellingPrice,
  tiers,
}: CoffeeTiersDialogProps) {
  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Volume Pricing</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Base Price: ${sellingPrice.toFixed(2)}</span>
            <span>Cost: ${costPrice.toFixed(2)}</span>
          </div>

          {sortedTiers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No volume pricing tiers configured.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTiers.map((tier) => {
                  const savings = sellingPrice - tier.price_per_unit;
                  const savingsPercent = sellingPrice > 0 ? ((savings / sellingPrice) * 100).toFixed(0) : 0;
                  const margin = tier.price_per_unit - costPrice;
                  const marginPercent = tier.price_per_unit > 0 ? ((margin / tier.price_per_unit) * 100).toFixed(0) : 0;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <Badge variant="outline">{tier.min_quantity}+</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${tier.price_per_unit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {savings > 0 ? (
                          <span className="text-primary">-{savingsPercent}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={margin > 0 ? "text-green-600" : "text-destructive"}>
                          ${margin.toFixed(2)} ({marginPercent}%)
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
