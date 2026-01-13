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

const MENU_ITEMS = [
  // Drinks
  { name: "Coffee", priceRange: [2.50, 4.99] },
  { name: "Latte", priceRange: [4.50, 6.99] },
  { name: "Hot Chocolate", priceRange: [3.50, 5.49] },
  { name: "Tea", priceRange: [2.25, 3.99] },
  { name: "Smoothie", priceRange: [5.50, 7.99] },
  { name: "Juice", priceRange: [3.25, 5.49] },
  { name: "Soda", priceRange: [1.99, 2.99] },
  { name: "Water", priceRange: [1.50, 2.50] },
  
  // Food
  { name: "Sandwich", priceRange: [6.99, 12.99] },
  { name: "Salad", priceRange: [8.99, 14.99] },
  { name: "Soup", priceRange: [4.99, 7.99] },
  { name: "Muffin", priceRange: [2.99, 4.49] },
  { name: "Cookie", priceRange: [1.99, 3.49] },
  { name: "Croissant", priceRange: [3.49, 5.49] },
  { name: "Bagel", priceRange: [2.99, 4.99] },
  { name: "Donut", priceRange: [1.50, 2.99] },
  { name: "Cake Slice", priceRange: [4.99, 7.99] },
  { name: "Pizza Slice", priceRange: [3.99, 5.99] },
  { name: "Burger", priceRange: [8.99, 14.99] },
  { name: "Fries", priceRange: [2.99, 4.99] },
  { name: "Nachos", priceRange: [7.99, 11.99] },
  { name: "Wrap", priceRange: [7.49, 10.99] },
  { name: "Quesadilla", priceRange: [6.99, 9.99] },
  { name: "Ice Cream", priceRange: [3.99, 6.99] },
];

export function generateOrder(level: number): OrderItem[] {
  // More items at higher levels
  const itemCount = Math.min(1 + Math.floor(level / 2), 5);
  const items: OrderItem[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < itemCount; i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * MENU_ITEMS.length);
    } while (usedIndices.has(idx) && usedIndices.size < MENU_ITEMS.length);
    
    usedIndices.add(idx);
    const menuItem = MENU_ITEMS[idx];
    const [min, max] = menuItem.priceRange;
    const price = Math.round((min + Math.random() * (max - min)) * 100) / 100;
    
    items.push({
      name: menuItem.name,
      price,
    });
  }

  return items;
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
