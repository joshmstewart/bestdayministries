import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, Loader2, Search, Sparkles, ArrowUp, ArrowDown, CheckCircle, Circle, Brain, ThumbsUp, ThumbsDown, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TextToSpeech } from "@/components/TextToSpeech";
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
  ai_quality_rating: string | null;
  ai_quality_reason: string | null;
  ai_reviewed_at: string | null;
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

interface JokeQualityResult {
  id: string;
  quality: "good" | "bad";
  reason: string;
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
  
  // Bulk quality review state
  const [reviewingAll, setReviewingAll] = useState(false);
  const [jokeQuality, setJokeQuality] = useState<Record<string, JokeQualityResult>>({});
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [selectedJokes, setSelectedJokes] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  
  // Edit joke state
  const [editingJoke, setEditingJoke] = useState<Joke | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  
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
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("joke_categories")
        .select("id, name, is_free")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const { data, error } = await supabase
        .from("joke_library")
        .select("category");

      if (error) throw error;

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

  // Load AI quality from database into state when jokes load
  useEffect(() => {
    const qualityFromDb: Record<string, JokeQualityResult> = {};
    jokes.forEach(joke => {
      if (joke.ai_quality_rating) {
        qualityFromDb[joke.id] = {
          id: joke.id,
          quality: joke.ai_quality_rating as "good" | "bad",
          reason: joke.ai_quality_reason || ""
        };
      }
    });
    if (Object.keys(qualityFromDb).length > 0) {
      setJokeQuality(prev => ({ ...qualityFromDb, ...prev }));
    }
  }, [jokes]);

  const handleDeleteJoke = async (id: string) => {
    try {
      const { error } = await supabase
        .from("joke_library")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setJokes(prev => prev.filter(j => j.id !== id));
      setJokeQuality(prev => {
        const newQuality = { ...prev };
        delete newQuality[id];
        return newQuality;
      });
      setSelectedJokes(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
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

  const handleDeleteSelected = async () => {
    if (selectedJokes.size === 0) return;
    
    setDeletingSelected(true);
    try {
      const idsToDelete = Array.from(selectedJokes);
      const { error } = await supabase
        .from("joke_library")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      setJokes(prev => prev.filter(j => !selectedJokes.has(j.id)));
      setJokeQuality(prev => {
        const newQuality = { ...prev };
        idsToDelete.forEach(id => delete newQuality[id]);
        return newQuality;
      });
      setSelectedJokes(new Set());
      loadCategoryStats();
      
      toast({
        title: "Jokes deleted",
        description: `Deleted ${idsToDelete.length} jokes from the library`,
      });
    } catch (error) {
      console.error("Error deleting jokes:", error);
      toast({
        title: "Error",
        description: "Failed to delete jokes",
        variant: "destructive",
      });
    } finally {
      setDeletingSelected(false);
    }
  };

  const handleToggleReviewed = async (id: string, currentValue: boolean) => {
    try {
      // If marking as reviewed and has a bad AI rating, clear it from DB too
      const updateData: Record<string, any> = { is_reviewed: !currentValue };
      if (!currentValue && jokeQuality[id]?.quality === "bad") {
        updateData.ai_quality_rating = null;
        updateData.ai_quality_reason = null;
        updateData.ai_reviewed_at = null;
      }
      
      const { error } = await supabase
        .from("joke_library")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setJokes(prev => prev.map(j => j.id === id ? { 
        ...j, 
        is_reviewed: !currentValue,
        ...(updateData.ai_quality_rating === null ? {
          ai_quality_rating: null,
          ai_quality_reason: null,
          ai_reviewed_at: null
        } : {})
      } : j));
      
      // If marking as reviewed and has a bad AI rating, clear it from state
      if (!currentValue && jokeQuality[id]?.quality === "bad") {
        setJokeQuality(prev => {
          const newQuality = { ...prev };
          delete newQuality[id];
          return newQuality;
        });
      }
      
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

  const handleEditJoke = (joke: Joke) => {
    setEditingJoke(joke);
    setEditQuestion(joke.question);
    setEditAnswer(joke.answer);
  };

  const handleSaveEdit = async () => {
    if (!editingJoke) return;
    
    setSavingEdit(true);
    try {
      // Clear AI quality in DB since joke was edited
      const { error } = await supabase
        .from("joke_library")
        .update({ 
          question: editQuestion.trim(), 
          answer: editAnswer.trim(),
          ai_quality_rating: null,
          ai_quality_reason: null,
          ai_reviewed_at: null
        })
        .eq("id", editingJoke.id);

      if (error) throw error;

      setJokes(prev => prev.map(j => 
        j.id === editingJoke.id 
          ? { 
              ...j, 
              question: editQuestion.trim(), 
              answer: editAnswer.trim(),
              ai_quality_rating: null,
              ai_quality_reason: null,
              ai_reviewed_at: null
            } 
          : j
      ));
      
      // Clear AI quality from state since joke was edited
      setJokeQuality(prev => {
        const newQuality = { ...prev };
        delete newQuality[editingJoke.id];
        return newQuality;
      });
      
      setEditingJoke(null);
      toast({
        title: "Joke updated",
        description: "Your changes have been saved (AI review cleared)",
      });
    } catch (error) {
      console.error("Error updating joke:", error);
      toast({
        title: "Error",
        description: "Failed to update joke",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
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

  const handleReviewAllJokes = async () => {
    // Filter out already-reviewed jokes AND jokes with existing AI ratings from AI review
    const jokesToReview = jokes.filter(j => !j.is_reviewed && !j.ai_quality_rating);
    
    if (jokesToReview.length === 0) {
      toast({
        title: "No jokes to review",
        description: "All jokes have been reviewed (manually or by AI)",
      });
      return;
    }
    
    setReviewingAll(true);
    
    try {
      // Process in batches of 20 to avoid token limits
      const batchSize = 20;
      const allResults: Record<string, JokeQualityResult> = {};
      
      for (let i = 0; i < jokesToReview.length; i += batchSize) {
        const batch = jokesToReview.slice(i, i + batchSize);
        const jokesForReview = batch.map(j => ({
          id: j.id,
          question: j.question,
          answer: j.answer
        }));

        const response = await supabase.functions.invoke("review-joke-quality", {
          body: { jokes: jokesForReview },
        });

        if (response.error) throw response.error;

        const results = response.data.reviews as JokeQualityResult[];
        
        // Save each result to the database
        for (const r of results) {
          allResults[r.id] = r;
          
          // Persist to database
          await supabase
            .from("joke_library")
            .update({ 
              ai_quality_rating: r.quality,
              ai_quality_reason: r.reason,
              ai_reviewed_at: new Date().toISOString()
            })
            .eq("id", r.id);
        }
        
        // Update state progressively
        setJokeQuality(prev => ({ ...prev, ...allResults }));
        
        // Update local jokes state with new AI ratings
        setJokes(prev => prev.map(j => {
          const result = allResults[j.id];
          if (result) {
            return {
              ...j,
              ai_quality_rating: result.quality,
              ai_quality_reason: result.reason,
              ai_reviewed_at: new Date().toISOString()
            };
          }
          return j;
        }));
      }
      
      const badCount = Object.values(allResults).filter(r => r.quality === "bad").length;
      const goodCount = Object.values(allResults).filter(r => r.quality === "good").length;
      
      toast({
        title: "Review complete!",
        description: `${goodCount} good, ${badCount} need attention (saved to database)`,
      });
    } catch (error) {
      console.error("Error reviewing jokes:", error);
      toast({
        title: "Error",
        description: "Failed to review jokes",
        variant: "destructive",
      });
    } finally {
      setReviewingAll(false);
    }
  };

  const handleSelectAllBad = () => {
    const badJokeIds = Object.entries(jokeQuality)
      .filter(([_, result]) => result.quality === "bad")
      .map(([id]) => id);
    setSelectedJokes(new Set(badJokeIds));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedJokes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedJokes.size === filteredJokes.length) {
      setSelectedJokes(new Set());
    } else {
      setSelectedJokes(new Set(filteredJokes.map(j => j.id)));
    }
  };

  const totalJokes = categoryStats.reduce((sum, s) => sum + s.count, 0);
  
  // Apply quality filter
  const filteredJokes = jokes.filter(joke => {
    if (filterQuality === "all") return true;
    const quality = jokeQuality[joke.id];
    if (filterQuality === "bad") return quality?.quality === "bad";
    if (filterQuality === "good") return quality?.quality === "good";
    if (filterQuality === "unreviewed") return !quality;
    return true;
  });

  const badCount = Object.values(jokeQuality).filter(r => r.quality === "bad").length;
  const goodCount = Object.values(jokeQuality).filter(r => r.quality === "good").length;

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
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleReviewAllJokes}
                disabled={reviewingAll || jokes.length === 0}
              >
                {reviewingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    AI Review All
                  </>
                )}
              </Button>
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
          {/* AI Review Stats */}
          {Object.keys(jokeQuality).length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">{goodCount} good</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-destructive" />
                <span className="font-medium">{badCount} need attention</span>
              </div>
              {badCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllBad}
                >
                  Select All Bad ({badCount})
                </Button>
              )}
              {selectedJokes.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deletingSelected}
                >
                  {deletingSelected ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Selected ({selectedJokes.size})
                </Button>
              )}
            </div>
          )}

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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jokes</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterQuality} onValueChange={setFilterQuality}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="AI Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality</SelectItem>
                <SelectItem value="bad">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-3 w-3 text-destructive" />
                    Bad Only
                  </span>
                </SelectItem>
                <SelectItem value="good">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                    Good Only
                  </span>
                </SelectItem>
                <SelectItem value="unreviewed">Not Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jokes Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="h-[500px] overflow-y-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedJokes.size === filteredJokes.length && filteredJokes.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[40px] text-center">AI</TableHead>
                      <TableHead className="w-[40px] text-center">✓</TableHead>
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
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJokes.map((joke) => {
                      const quality = jokeQuality[joke.id];
                      return (
                        <TableRow 
                          key={joke.id}
                          className={quality?.quality === "bad" ? "bg-destructive/5" : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedJokes.has(joke.id)}
                              onCheckedChange={() => handleToggleSelect(joke.id)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex justify-center">
                                    {quality ? (
                                      quality.quality === "good" ? (
                                        <ThumbsUp className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <ThumbsDown className="h-4 w-4 text-destructive" />
                                      )
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {quality && (
                                  <TooltipContent side="right" className="max-w-[300px]">
                                    <p>{quality.reason}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
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
                          <TableCell className="font-medium">
                            <div className="flex items-start gap-1">
                              <span className="flex-1">{joke.question}</span>
                              <TextToSpeech text={joke.question} size="icon" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1">
                              <span className="flex-1">{joke.answer}</span>
                              <TextToSpeech text={joke.answer} size="icon" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{joke.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{joke.times_served}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(joke.created_at), "M/d/yy h:mm a")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditJoke(joke)}
                                title="Edit joke"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteJoke(joke.id)}
                                title="Delete joke"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredJokes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No jokes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Showing {filteredJokes.length} jokes {filterCategory !== "all" && `in "${filterCategory}"`}
            {filterQuality !== "all" && ` (${filterQuality} quality)`}
          </p>
        </CardContent>
      </Card>

      {/* Edit Joke Dialog */}
      <Dialog open={!!editingJoke} onOpenChange={(open) => !open && setEditingJoke(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Joke</DialogTitle>
            <DialogDescription>
              Modify the question or answer to fix the joke
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder="Why did the..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                placeholder="Because..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJoke(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={savingEdit || !editQuestion.trim() || !editAnswer.trim()}
            >
              {savingEdit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
