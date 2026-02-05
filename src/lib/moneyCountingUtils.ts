import { OrderItem } from "@/pages/MoneyCounting";

export const DENOMINATIONS = [
  { value: 100, label: "$100", type: "bill" },
  { value: 50, label: "$50", type: "bill" },
  { value: 20, label: "$20", type: "bill" },
  { value: 10, label: "$10", type: "bill" },
  { value: 5, label: "$5", type: "bill" },
  { value: 1, label: "$1", type: "bill" },
  { value: 0.25, label: "25¢", type: "coin" },
  { value: 0.10, label: "10¢", type: "coin" },
  { value: 0.05, label: "5¢", type: "coin" },
  { value: 0.01, label: "1¢", type: "coin" },
];

// Default menu items fallback
const DEFAULT_MENU_ITEMS = [
  { name: "Coffee", priceRange: [2.50, 4.99] as [number, number] },
  { name: "Latte", priceRange: [4.50, 6.99] as [number, number] },
  { name: "Sandwich", priceRange: [6.99, 12.99] as [number, number] },
  { name: "Muffin", priceRange: [2.99, 4.49] as [number, number] },
  { name: "Cookie", priceRange: [1.99, 3.49] as [number, number] },
];

export interface MenuItem {
  name: string;
  priceRange: [number, number];
}

export function generateOrder(level: number, menuItems?: MenuItem[]): OrderItem[] {
  const menu = menuItems && menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS;
  
  // More items at higher levels
  const itemCount = Math.min(1 + Math.floor(level / 2), 5);
  const orderItems: OrderItem[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < itemCount; i++) {
    // Stop if we've used all available menu items
    if (usedIndices.size >= menu.length) break;
    
    let idx: number;
    // Keep trying until we find an unused item
    do {
      idx = Math.floor(Math.random() * menu.length);
    } while (usedIndices.has(idx));
    
    usedIndices.add(idx);
    const menuItem = menu[idx];
    const [min, max] = menuItem.priceRange;
    const price = Math.round((min + Math.random() * (max - min)) * 100) / 100;
    
    orderItems.push({
      name: menuItem.name,
      price,
    });
  }

  return orderItems;
}

export function calculateOptimalChange(amount: number): { [key: string]: number } {
  const result: { [key: string]: number } = {};
  let remaining = Math.round(amount * 100); // Work in cents to avoid floating point issues

  const denomsInCents = [10000, 5000, 2000, 1000, 500, 100, 25, 10, 5, 1];
  const denomLabels = ["100", "50", "20", "10", "5", "1", "0.25", "0.10", "0.05", "0.01"];

  for (let i = 0; i < denomsInCents.length; i++) {
    const count = Math.floor(remaining / denomsInCents[i]);
    if (count > 0) {
      result[denomLabels[i]] = count;
      remaining -= count * denomsInCents[i];
    }
  }

  return result;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function getDenominationLabel(value: string): string {
  const numValue = parseFloat(value);
  if (numValue >= 1) {
    return `$${numValue}`;
  } else {
    return `${Math.round(numValue * 100)}¢`;
  }
}
