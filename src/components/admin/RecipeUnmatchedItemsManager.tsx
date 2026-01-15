import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Check, RefreshCw, Trash2, UtensilsCrossed, Carrot } from "lucide-react";
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

// Format item name to proper case (capitalize first letter of each word)
function formatItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

export function RecipeUnmatchedItemsManager() {
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ingredients");

  useEffect(() => {
    loadItems();
  }, []);

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

  const filteredItems = items.filter(item => 
    activeTab === "ingredients" ? item.item_type === "ingredient" : item.item_type === "tool"
  );

  const unresolvedCount = (type: string) => 
    items.filter(i => i.item_type === type && !i.is_resolved).length;

  const totalOccurrences = (type: string) =>
    items.filter(i => i.item_type === type && !i.is_resolved)
      .reduce((sum, i) => sum + i.occurrence_count, 0);

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
              Consider adding popular items to the wizard.
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
                    const formattedName = formatItemName(item.item_name);
                    return (
                      <TableRow key={item.id} className={item.is_resolved ? "opacity-50" : ""}>
                        <TableCell className="font-medium text-muted-foreground">
                          {item.item_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary font-medium">
                            {formattedName}
                          </Badge>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkResolved(item, formattedName)}
                                title={`Mark as resolved and add as "${formattedName}"`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
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
