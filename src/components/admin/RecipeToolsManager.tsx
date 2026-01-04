import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, RefreshCw, Check, ImageOff, AlertTriangle, X, Copy } from "lucide-react";

interface RecipeTool {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface GenerationError {
  toolName: string;
  error: string;
}

export const RecipeToolsManager = () => {
  const [tools, setTools] = useState<RecipeTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [errors, setErrors] = useState<GenerationError[]>([]);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const { data, error } = await supabase
      .from("recipe_tools")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      toast.error("Failed to load tools");
      console.error(error);
    } else {
      // Add cache-busting timestamp to image URLs
      const toolsWithCacheBust = (data || []).map(tool => ({
        ...tool,
        image_url: tool.image_url 
          ? `${tool.image_url}?t=${Date.now()}`
          : null
      }));
      setTools(toolsWithCacheBust);
    }
    setLoading(false);
  };

  const generateIcon = async (
    tool: RecipeTool
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-recipe-tool-icon",
        {
          body: {
            toolId: tool.id,
            toolName: tool.name,
            category: tool.category,
          },
        }
      );

      if (error) {
        console.error(`Failed to generate icon for ${tool.name}:`, error);
        return { ok: false, errorMessage: error.message || String(error) };
      }
      
      // Check if the response contains an error
      if ((data as any)?.error) {
        return { ok: false, errorMessage: (data as any).error };
      }

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${tool.name}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errorMessage: message };
    }
  };

  const handleGenerateMissing = async () => {
    const missingIcons = tools.filter((t) => !t.image_url);
    
    if (missingIcons.length === 0) {
      toast.info("All tools already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setErrors([]); // Clear previous errors

    let successCount = 0;
    const BATCH_SIZE = 5;
    const batch = missingIcons.slice(0, BATCH_SIZE); // Only take first 5
    const total = batch.length;
    const newErrors: GenerationError[] = [];

    setCurrentTool(`${batch.map(b => b.name).join(", ")}`);

    // Run batch in parallel
    const results = await Promise.all(
      batch.map(async (tool) => {
        const result = await generateIcon(tool);
        return { tool, result };
      })
    );

    // Process results
    for (const { tool, result } of results) {
      if (result.ok) {
        successCount++;
      } else {
        newErrors.push({
          toolName: tool.name,
          error: result.errorMessage || "Unknown error",
        });
      }
    }

    setProgress(100);
    setGenerating(false);
    setCurrentTool(null);
    setErrors(newErrors);

    const remaining = missingIcons.length - BATCH_SIZE;
    if (successCount === total && remaining > 0) {
      toast.success(`Generated ${successCount} icons! ${remaining} remaining.`);
    } else if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. ${newErrors.length} failed - see errors below.`);
    }

    await loadTools();
  };

  const handleRegenerate = async (tool: RecipeTool) => {
    setRegeneratingId(tool.id);

    const result = await generateIcon(tool);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, image_url: cacheBustedUrl } : t))
        );
      }
      // Remove from errors if it was there
      setErrors((prev) => prev.filter((e) => e.toolName !== tool.name));
      toast.success(`Regenerated icon for ${tool.name}`);
    } else {
      // Add to errors for persistent display
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.toolName !== tool.name);
        return [...filtered, { toolName: tool.name, error: result.errorMessage || "Unknown error" }];
      });
      toast.error(`Failed to regenerate icon for ${tool.name}`);
    }

    setRegeneratingId(null);
  };

  const handleCopyErrors = () => {
    const errorText = errors
      .map((e) => `${e.toolName}: ${e.error}`)
      .join("\n");
    navigator.clipboard.writeText(errorText);
    toast.success("Errors copied to clipboard");
  };

  const handleDismissErrors = () => {
    setErrors([]);
  };

  const missingCount = tools.filter((t) => !t.image_url).length;

  // Group tools by category
  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, RecipeTool[]>);

  // Category display names
  const categoryLabels: Record<string, string> = {
    appliances: "🔌 Appliances",
    cookware: "🍳 Cookware",
    utensils: "🥄 Utensils",
    bakeware: "🧁 Bakeware",
    prep: "🔪 Prep Tools",
    storage: "📦 Storage",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Maker Kitchen Tools</CardTitle>
          <CardDescription>
            Manage kitchen tool icons for the Recipe Maker game. 
            {missingCount > 0 
              ? ` ${missingCount} tools need icons.`
              : " All tools have icons."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateMissing}
              disabled={generating || missingCount === 0}
              variant={missingCount > 0 ? "default" : "outline"}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Missing Icons ({missingCount})
                </>
              )}
            </Button>

            {missingCount === 0 && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                All icons generated
              </span>
            )}
          </div>

          {generating && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Generating: {currentTool}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persistent Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{errors.length} Generation Error{errors.length > 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyErrors}
                className="h-7 px-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissErrors}
                className="h-7 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
              {errors.map((err, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 rounded">
                  <span className="font-semibold">{err.toolName}:</span>{" "}
                  <span className="break-all">{err.error}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tools by category */}
      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
            <CardDescription>
              {categoryTools.filter((t) => t.image_url).length}/{categoryTools.length} have icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryTools.map((tool) => (
                <div
                  key={tool.id}
                  className="relative group rounded-lg border-2 border-border overflow-hidden aspect-square"
                >
                  {tool.image_url ? (
                    <img
                      src={tool.image_url}
                      alt={tool.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                    <span className="text-xs text-white font-medium">{tool.name}</span>
                  </div>

                  {/* Regenerate button on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegenerate(tool)}
                      disabled={regeneratingId === tool.id || generating}
                    >
                      {regeneratingId === tool.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
