import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/moneyCountingUtils";
import { OrderItem } from "@/pages/MoneyCounting";

interface ReceiptDisplayProps {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  storeName?: string;
  storeAddress?: string | null;
  storeTagline?: string | null;
}

// Store-specific details
const STORE_DETAILS: Record<string, { name: string; address: string; tagline: string }> = {
  "Coffee Shop": {
    name: "JOY CAFÉ",
    address: "123 Main Street",
    tagline: "Thank you for your order!",
  },
  "Grocery Store": {
    name: "FRESH MARKET",
    address: "456 Oak Avenue",
    tagline: "Fresh foods, great prices!",
  },
  "Clothing Store": {
    name: "STYLE BOUTIQUE",
    address: "789 Fashion Blvd",
    tagline: "Look good, feel great!",
  },
  "Convenience Store": {
    name: "QUICK STOP",
    address: "321 Corner Street",
    tagline: "Fast & friendly service!",
  },
  "Bakery": {
    name: "SWEET DELIGHTS BAKERY",
    address: "555 Baker Lane",
    tagline: "Fresh baked daily!",
  },
};

export function ReceiptDisplay({ items, subtotal, tax, total, storeName, storeAddress, storeTagline }: ReceiptDisplayProps) {
  // Use database-stored details first, then predefined fallbacks, then generate from store name
  const storeDetails = storeName && STORE_DETAILS[storeName] 
    ? {
        name: STORE_DETAILS[storeName].name,
        address: storeAddress || STORE_DETAILS[storeName].address,
        tagline: storeTagline || STORE_DETAILS[storeName].tagline,
      }
    : {
        name: storeName?.toUpperCase() || "JOY CAFÉ",
        address: storeAddress || "123 Main Street",
        tagline: storeTagline || "Thank you for your order!",
      };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🧾</span>
          Order Receipt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 font-mono text-sm border-2 border-dashed border-muted">
          {/* Store header */}
          <div className="text-center mb-4">
            <p className="font-bold text-lg">{storeDetails.name}</p>
            <p className="text-xs text-muted-foreground">{storeDetails.address}</p>
            <p className="text-xs text-muted-foreground">{storeDetails.tagline}</p>
          </div>

          <Separator className="my-2 border-dashed" />

          {/* Items */}
          <div className="space-y-1">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>{item.name}</span>
                <span>{formatMoney(item.price)}</span>
              </div>
            ))}
          </div>

          <Separator className="my-2 border-dashed" />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span>{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>TOTAL</span>
              <span>{formatMoney(total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
