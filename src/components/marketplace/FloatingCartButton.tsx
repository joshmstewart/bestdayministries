import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingCartButtonProps {
  cartCount: number;
  onClick: () => void;
}

export const FloatingCartButton = ({ cartCount, onClick }: FloatingCartButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      aria-label="Open shopping cart"
    >
      <ShoppingCart className="h-6 w-6" />
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full min-w-6 h-6 flex items-center justify-center text-xs font-bold px-1">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Button>
  );
};
