import { useState } from "react";
import { ChevronDown, ShoppingCart } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { RecipeExpansionTips } from "./RecipeExpansionTips";

interface CollapsibleShoppingTipsProps {
  ingredients: string[];
  tools: string[];
  userId?: string;
  defaultOpen?: boolean;
  onIngredientAdded?: (name: string) => void;
  onToolAdded?: (name: string) => void;
}

export const CollapsibleShoppingTips = ({
  ingredients,
  tools,
  userId,
  defaultOpen = false,
  onIngredientAdded,
  onToolAdded,
}: CollapsibleShoppingTipsProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Don't show if no ingredients or tools
  if (ingredients.length === 0 && tools.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2 mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span>Shopping Tips</span>
            <span className="text-xs text-muted-foreground">
              — suggestions to expand your cooking options
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mb-6">
        <RecipeExpansionTips
          ingredients={ingredients}
          tools={tools}
          userId={userId}
          showTitle={false}
          onIngredientAdded={onIngredientAdded}
          onToolAdded={onToolAdded}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
