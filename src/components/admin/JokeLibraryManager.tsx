import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, RefreshCw, Loader2, Search, Sparkles, ArrowUp, ArrowDown, CheckCircle, Circle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Joke {
  id: string;
  question: string;
  answer: string;
  category: string;
  category_id: string | null;
  times_served: number;
  created_at: string;
  is_reviewed: boolean;
}

interface JokeCategory {
  id: string;
  name: string;
  is_free: boolean;
}

interface CategoryStats {
  category: string;
  count: number;
}

export const JokeLibraryManager = () => {
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [categories, setCategories] = useState<JokeCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [generateCount, setGenerateCount] = useState(20);
  const [generateCategory, setGenerateCategory] = useState<string>("random");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterReviewed, setFilterReviewed] = useState<string>("all");
  const { toast } = useToast();

  const loadJokes = useCallback(async () => {
    try {
      let query = supabase
        .from("joke_library")
        .select("*")
        .order("created_at", { ascending: sortOrder === "asc" });

      if (filterCategory && filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      if (filterReviewed === "reviewed") {
        query = query.eq("is_reviewed", true);
      } else if (filterReviewed === "unreviewed") {
        query = query.eq("is_reviewed", false);
      }

      if (searchQuery) {
        query = query.or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setJokes(data || []);
    } catch (error) {
      console.error("Error loading jokes:", error);
      toast({
        title: "Error",
        description: "Failed to load jokes",
        variant: "destructive",
      });
    }
  }, [filterCategory, filterReviewed, searchQuery, sortOrder, toast]);

  const loadCategoryStats = useCallback(async () => {
    try {
      // Load categories from database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("joke_categories")
        .select("id, name, is_free")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load joke counts
      const { data, error } = await supabase
        .from("joke_library")
        .select("category");

      if (error) throw error;

      // Count jokes per category
      const counts: Record<string, number> = {};
      (data || []).forEach((joke) => {
        const cat = joke.category || "uncategorized";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      const stats = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setCategoryStats(stats);
    } catch (error) {
      console.error("Error loading category stats:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadJokes(), loadCategoryStats()]);
      setLoading(false);
    };
    init();
  }, [loadJokes, loadCategoryStats]);

  const handleDeleteJoke = async (id: string) => {
    try {
      const { error } = await supabase
        .from("joke_library")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setJokes(prev => prev.filter(j => j.id !== id));
      loadCategoryStats();
      
      toast({
        title: "Joke deleted",
        description: "The joke has been removed from the library",
      });
    } catch (error) {
      console.error("Error deleting joke:", error);
      toast({
        title: "Error",
        description: "Failed to delete joke",
        variant: "destructive",
      });
    }
  };

  const handleToggleReviewed = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("joke_library")
        .update({ is_reviewed: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setJokes(prev => prev.map(j => j.id === id ? { ...j, is_reviewed: !currentValue } : j));
      
      toast({
        title: !currentValue ? "Marked as reviewed" : "Marked as unreviewed",
        description: "Joke status updated",
      });
    } catch (error) {
      console.error("Error updating joke:", error);
      toast({
        title: "Error",
        description: "Failed to update joke",
        variant: "destructive",
      });
    }
  };

  const handleGenerateJokes = async () => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("seed-jokes", {
        body: { count: generateCount, category: generateCategory },
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      toast({
        title: "Jokes generated!",
        description: `Added ${result.inserted} new jokes (${result.duplicates} duplicates skipped)`,
      });

      setGenerateDialogOpen(false);
      loadJokes();
      loadCategoryStats();
    } catch (error) {
      console.error("Error generating jokes:", error);
      toast({
        title: "Error",
        description: "Failed to generate jokes",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const totalJokes = categoryStats.reduce((sum, s) => sum + s.count, 0);

  const filteredJokes = jokes;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{totalJokes}</CardTitle>
            <CardDescription>Total Jokes</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{categoryStats.length}</CardTitle>
            <CardDescription>Categories Used</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{categories.length}</CardTitle>
            <CardDescription>Available Categories</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">
              {categoryStats[0]?.category || "—"}
            </CardTitle>
            <CardDescription>Top Category ({categoryStats[0]?.count || 0})</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Category Stats */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Jokes per category (manage categories above)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categoryStats.map((stat) => (
              <Badge
                key={stat.category}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => setFilterCategory(stat.category)}
              >
                {stat.category}: {stat.count}
              </Badge>
            ))}
            {categoryStats.length === 0 && (
              <p className="text-muted-foreground text-sm">No jokes in the library yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate & Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle>Joke Library</CardTitle>
              <CardDescription>Manage and generate jokes</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Jokes
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New Jokes</DialogTitle>
                    <DialogDescription>
                      Use AI to generate new jokes for the library
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Number of Jokes</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Max 50 per batch</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={generateCategory} onValueChange={setGenerateCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="random">Random (Mixed)</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleGenerateJokes} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => { loadJokes(); loadCategoryStats(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jokes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterReviewed} onValueChange={setFilterReviewed}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jokes</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jokes Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">✓</TableHead>
                    <TableHead className="w-[30%]">Question</TableHead>
                    <TableHead className="w-[25%]">Answer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Served</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortOrder === "desc" ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJokes.map((joke) => (
                    <TableRow key={joke.id}>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleReviewed(joke.id, joke.is_reviewed)}
                          title={joke.is_reviewed ? "Reviewed - click to unmark" : "Click to mark as reviewed"}
                        >
                          {joke.is_reviewed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{joke.question}</TableCell>
                      <TableCell>{joke.answer}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{joke.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{joke.times_served}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(joke.created_at), "M/d/yy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteJoke(joke.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredJokes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No jokes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          
          <p className="text-sm text-muted-foreground">
            Showing {filteredJokes.length} jokes {filterCategory !== "all" && `in "${filterCategory}"`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
