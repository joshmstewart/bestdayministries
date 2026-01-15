import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, RefreshCw, Trash2, UtensilsCrossed, Carrot, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UnmatchedItem {
  id: string;
  item_name: string;
  item_type: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  is_resolved: boolean;
  resolved_to: string | null;
  resolved_at: string | null;
}

// Preparation terms that should be stripped to find the actual ingredient
const PREP_PATTERNS: { pattern: RegExp; toolSuggestion?: string }[] = [
  { pattern: /^zest\s+of\s+/i, toolSuggestion: "Zester" },
  { pattern: /\s+zest$/i, toolSuggestion: "Zester" },
  { pattern: /^juice\s+of\s+/i, toolSuggestion: "Juicer" },
  { pattern: /\s+juice$/i, toolSuggestion: "Juicer" },
  { pattern: /^minced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^diced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^chopped\s+/i, toolSuggestion: "Knife" },
  { pattern: /^sliced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^grated\s+/i, toolSuggestion: "Grater" },
  { pattern: /^shredded\s+/i, toolSuggestion: "Grater" },
  { pattern: /^mashed\s+/i, toolSuggestion: "Masher" },
  { pattern: /^crushed\s+/i },
  { pattern: /^ground\s+/i },
  { pattern: /^fresh\s+/i },
  { pattern: /^dried\s+/i },
  { pattern: /^frozen\s+/i },
  { pattern: /^melted\s+/i },
  { pattern: /^softened\s+/i },
  { pattern: /^cooked\s+/i },
  { pattern: /^raw\s+/i },
];

interface FormattedResult {
  name: string;
  toolSuggestion?: string;
}

// Format item name intelligently - extract actual ingredient from prep descriptions
function formatItemName(name: string): FormattedResult {
  let cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  let toolSuggestion: string | undefined;

  // Apply preparation patterns
  for (const { pattern, toolSuggestion: tool } of PREP_PATTERNS) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
      if (tool && !toolSuggestion) {
        toolSuggestion = tool;
      }
    }
  }

  // Capitalize each word
  const formatted = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();

  return { name: formatted, toolSuggestion };
}

export function RecipeUnmatchedItemsManager() {
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ingredients");
  const [existingIngredients, setExistingIngredients] = useState<Set<string>>(new Set());
  const [existingTools, setExistingTools] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, { name: string; toolSuggestion?: string }>>({});

  useEffect(() => {
    loadItems();
    loadExistingItems();
  }, []);

  const loadExistingItems = async () => {
    try {
      const [ingredientsResult, toolsResult] = await Promise.all([
        supabase.from("recipe_ingredients").select("name"),
        supabase.from("recipe_tools").select("name"),
      ]);

      if (ingredientsResult.data) {
        setExistingIngredients(new Set(ingredientsResult.data.map(i => i.name.toLowerCase())));
      }
      if (toolsResult.data) {
        setExistingTools(new Set(toolsResult.data.map(t => t.name.toLowerCase())));
      }
    } catch (err) {
      console.error("Error loading existing items:", err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipe_unmatched_items")
        .select("*")
        .order("occurrence_count", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error loading unmatched items:", err);
      toast.error("Failed to load unmatched items");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async (item: UnmatchedItem, resolvedTo?: string) => {
    try {
      const { error } = await supabase
        .from("recipe_unmatched_items")
        .update({
          is_resolved: true,
          resolved_to: resolvedTo || null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast.success(`Marked "${item.item_name}" as resolved`);
      setEditingId(null);
      loadItems();
    } catch (err) {
      console.error("Error marking resolved:", err);
      toast.error("Failed to update item");
    }
  };

  const handleDelete = async (item: UnmatchedItem) => {
    try {
      const { error } = await supabase
        .from("recipe_unmatched_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success(`Deleted "${item.item_name}"`);
      loadItems();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to delete item");
    }
  };

  const getFormattedForItem = (item: UnmatchedItem): FormattedResult => {
    // If we have an edited value, use that
    if (editedNames[item.id]) {
      return editedNames[item.id];
    }
    // Otherwise calculate from original
    return formatItemName(item.item_name);
  };

  const startEditing = (item: UnmatchedItem) => {
    const formatted = formatItemName(item.item_name);
    setEditedNames(prev => ({
      ...prev,
      [item.id]: formatted,
    }));
    setEditingId(item.id);
  };

  const updateEditedName = (itemId: string, field: 'name' | 'toolSuggestion', value: string) => {
    setEditedNames(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value || undefined,
      },
    }));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  // Check if the formatted name already exists
  const checkAlreadyExists = (formattedName: string, itemType: string): boolean => {
    const nameLower = formattedName.toLowerCase();
    if (itemType === "ingredient") {
      return existingIngredients.has(nameLower);
    } else {
      return existingTools.has(nameLower);
    }
  };

  // Filter items - show only those whose formatted name doesn't already exist
  const filteredItems = items.filter(item => {
    // First filter by tab
    if (activeTab === "ingredients" && item.item_type !== "ingredient") return false;
    if (activeTab === "tools" && item.item_type !== "tool") return false;
    
    // If resolved, show it
    if (item.is_resolved) return true;
    
    // Check if formatted name already exists - if so, auto-resolve it
    const formatted = formatItemName(item.item_name);
    const alreadyExists = checkAlreadyExists(formatted.name, item.item_type);
    
    return !alreadyExists;
  });

  // Auto-resolve items that match existing ingredients/tools
  useEffect(() => {
    const autoResolveMatches = async () => {
      if (existingIngredients.size === 0 && existingTools.size === 0) return;
      
      for (const item of items) {
        if (item.is_resolved) continue;
        
        const formatted = formatItemName(item.item_name);
        const alreadyExists = checkAlreadyExists(formatted.name, item.item_type);
        
        if (alreadyExists) {
          // Auto-resolve this item
          await supabase
            .from("recipe_unmatched_items")
            .update({
              is_resolved: true,
              resolved_to: `Auto-matched: ${formatted.name}`,
              resolved_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        }
      }
      
      // Reload to reflect changes
      loadItems();
    };

    if (items.length > 0 && (existingIngredients.size > 0 || existingTools.size > 0)) {
      autoResolveMatches();
    }
  }, [existingIngredients, existingTools]); // Only run when existing items are loaded

  const unresolvedCount = (type: string) => {
    return items.filter(i => {
      if (i.item_type !== type || i.is_resolved) return false;
      const formatted = formatItemName(i.item_name);
      return !checkAlreadyExists(formatted.name, i.item_type);
    }).length;
  };

  const totalOccurrences = (type: string) =>
    items.filter(i => {
      if (i.item_type !== type || i.is_resolved) return false;
      const formatted = formatItemName(i.item_name);
      return !checkAlreadyExists(formatted.name, i.item_type);
    }).reduce((sum, i) => sum + i.occurrence_count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Unmatched Recipe Items
            </CardTitle>
            <CardDescription>
              Items from user-imported recipes that don't match wizard ingredients/tools. 
              Items matching existing entries are auto-resolved.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <Carrot className="h-4 w-4" />
              Ingredients
              {unresolvedCount("ingredient") > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unresolvedCount("ingredient")}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Tools
              {unresolvedCount("tool") > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unresolvedCount("tool")}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <div className="text-2xl font-bold">{unresolvedCount(activeTab === "ingredients" ? "ingredient" : "tool")}</div>
                <div className="text-sm text-muted-foreground">Unresolved Items</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">{totalOccurrences(activeTab === "ingredients" ? "ingredient" : "tool")}</div>
                <div className="text-sm text-muted-foreground">Total Occurrences</div>
              </Card>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No unmatched {activeTab} found!</p>
                <p className="text-sm">All imported recipe items match the wizard.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Name</TableHead>
                    <TableHead>Formatted Name</TableHead>
                    <TableHead className="text-center">Times Seen</TableHead>
                    <TableHead>First Seen</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const formatted = getFormattedForItem(item);
                    const isEditing = editingId === item.id;
                    
                    return (
                      <TableRow key={item.id} className={item.is_resolved ? "opacity-50" : ""}>
                        <TableCell className="font-medium text-muted-foreground">
                          {item.item_name}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={formatted.name}
                                onChange={(e) => updateEditedName(item.id, 'name', e.target.value)}
                                className="h-8 w-40"
                                placeholder="Ingredient name"
                              />
                              {item.item_type === "ingredient" && (
                                <Input
                                  value={formatted.toolSuggestion || ''}
                                  onChange={(e) => updateEditedName(item.id, 'toolSuggestion', e.target.value)}
                                  className="h-8 w-40"
                                  placeholder="Tool suggestion (optional)"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="bg-primary/10 text-primary font-medium w-fit">
                                {formatted.name}
                              </Badge>
                              {formatted.toolSuggestion && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UtensilsCrossed className="h-3 w-3" />
                                  Needs: {formatted.toolSuggestion}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.occurrence_count >= 5 ? "destructive" : item.occurrence_count >= 2 ? "secondary" : "outline"}>
                            {item.occurrence_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.first_seen_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.last_seen_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {item.is_resolved ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              {item.resolved_to ? `→ ${item.resolved_to}` : "Resolved"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!item.is_resolved && (
                              <>
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkResolved(item, formatted.name)}
                                      title="Confirm and resolve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditing}
                                      title="Cancel editing"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditing(item)}
                                      title="Edit formatted name"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkResolved(item, formatted.name)}
                                      title={`Mark as resolved and add as "${formatted.name}"`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="text-destructive hover:text-destructive"
                              title="Delete this item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
