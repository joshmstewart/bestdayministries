import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

interface RecipeTool {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  image_url: string | null;
  display_order: number;
}

interface RecipeToolsSelectorProps {
  selectedTools: string[];
  onToggle: (toolName: string) => void;
}

// Lazy loading image component
const LazyToolImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="absolute inset-0">
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

// Helper to get emoji for tools without images
const getToolEmoji = (name: string, icon: string | null): string => {
  if (icon) return icon;
  
  const emojiMap: Record<string, string> = {
    Oven: "🔥",
    Stove: "🍳",
    Microwave: "📻",
    Toaster: "🍞",
    Blender: "🥤",
    "Frying Pan": "🍳",
    "Sauce Pan": "🥘",
    Pot: "🍲",
    "Baking Sheet": "🍪",
    "Mixing Bowl": "🥣",
    Spatula: "🥄",
    Whisk: "🥢",
    Knife: "🔪",
    "Cutting Board": "🪵",
    "Measuring Cups": "🥛",
    "Measuring Spoons": "🥄",
    Tongs: "🥢",
    "Can Opener": "🥫",
    Colander: "🥗",
    Grater: "🧀",
  };
  return emojiMap[name] || "🔧";
};

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
      <p className="text-sm text-muted-foreground text-center">
        Tap the kitchen tools you have available
      </p>

      {categoryOrder.map(category => {
        const categoryTools = toolsByCategory[category];
        if (!categoryTools?.length) return null;

        return (
          <div key={category} className="space-y-3">
            {/* Category header */}
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {categoryLabels[category] || category}
              {categoryTools.filter(t => selectedTools.includes(t.name)).length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {categoryTools.filter(t => selectedTools.includes(t.name)).length} selected
                </span>
              )}
            </h3>

            {/* Tools grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {categoryTools.map(tool => {
                const isSelected = selectedTools.includes(tool.name);

                return (
                  <button
                    key={tool.id}
                    onClick={() => onToggle(tool.name)}
                    className={cn(
                      "relative rounded-xl border-2 transition-all duration-200 overflow-hidden",
                      "hover:scale-105 hover:shadow-lg",
                      "flex flex-col items-center text-center aspect-square",
                      isSelected
                        ? "border-primary shadow-md ring-2 ring-primary/50"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}

                    {/* Tool image or placeholder */}
                    {tool.image_url ? (
                      <LazyToolImage src={tool.image_url} alt={tool.name} />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full flex items-center justify-center text-3xl"
                        style={{
                          background: `linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))`,
                        }}
                      >
                        {getToolEmoji(tool.name, tool.icon)}
                      </div>
                    )}

                    {/* Tool name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-1.5 pt-4">
                      <span className="font-medium text-xs text-white drop-shadow-md line-clamp-2">
                        {tool.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected tools summary */}
      {selectedTools.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 sticky bottom-0">
          <p className="text-sm font-medium mb-2">
            Selected ({selectedTools.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTools.map((name) => (
              <button
                key={name}
                onClick={() => onToggle(name)}
                className="px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
              >
                {name} ×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
