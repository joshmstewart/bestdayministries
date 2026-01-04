import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeTool {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  display_order: number;
}

interface RecipeToolsSelectorProps {
  selectedTools: string[];
  onToggle: (toolName: string) => void;
}

const categoryLabels: Record<string, string> = {
  appliances: "🔌 Appliances",
  cookware: "🍳 Cookware & Bakeware",
  utensils: "🥄 Utensils & Tools",
};

const categoryOrder = ["appliances", "cookware", "utensils"];

export const RecipeToolsSelector = ({ selectedTools, onToggle }: RecipeToolsSelectorProps) => {
  const [tools, setTools] = useState<RecipeTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTools = async () => {
      const { data, error } = await supabase
        .from("recipe_tools")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (!error && data) {
        setTools(data);
      }
      setLoading(false);
    };

    loadTools();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Group tools by category
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, RecipeTool[]>);

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => {
        const categoryTools = toolsByCategory[category];
        if (!categoryTools?.length) return null;

        return (
          <div key={category}>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">
              {categoryLabels[category] || category}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {categoryTools.map(tool => {
                const isSelected = selectedTools.includes(tool.name);
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToggle(tool.name)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <span className="text-lg flex-shrink-0">{tool.icon || "🔧"}</span>
                    <span className={cn(
                      "line-clamp-1",
                      isSelected && "font-medium"
                    )}>
                      {tool.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected summary */}
      {selectedTools.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {selectedTools.length} tool{selectedTools.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTools.map(tool => (
                <span
                  key={tool}
                  className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                >
                  {tool}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
