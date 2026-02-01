import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  Trash2,
  Plus,
  RefreshCw,
  Book,
  Heart,
  Quote,
  Lightbulb,
  ThumbsUp,
  MessageCircle,
  Archive,
  ArchiveRestore,
  Clock,
  Target,
  Zap,
  Smile,
  Coffee,
  Ear,
  Compass,
  Leaf,
  Palette,
  TrendingUp,
  Users,
  Moon,
  DollarSign,
  Activity,
  Hourglass,
  BarChart3,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type FortuneSourceType = "bible_verse" | "affirmation" | "quote" | "life_lesson" | "gratitude_prompt" | "discussion_starter" | "proverbs";

interface Fortune {
  id: string;
  content: string;
  source_type: FortuneSourceType;
  author: string | null;
  reference: string | null;
  theme: string | null;
  is_approved: boolean;
  is_used: boolean;
  is_archived: boolean;
  used_date: string | null;
  created_at: string;
}

// Theme definitions matching the edge function
const THEME_OPTIONS = [
  { value: "any", label: "Any Theme (default)", icon: Sparkles, color: "text-muted-foreground" },
  { value: "time_preciousness", label: "⏰ Time & Its Preciousness", icon: Clock, color: "text-orange-500" },
  { value: "simplicity_focus", label: "🎯 Simplicity & Focus", icon: Target, color: "text-blue-500" },
  { value: "action_over_thinking", label: "🚀 Action Over Thinking", icon: Zap, color: "text-yellow-500" },
  { value: "humor_lightness", label: "😄 Humor & Lightness", icon: Smile, color: "text-pink-500" },
  { value: "self_care", label: "☕ Self-Care & Rest", icon: Coffee, color: "text-amber-600" },
  { value: "listening_communication", label: "👂 Listening & Communication", icon: Ear, color: "text-indigo-500" },
  { value: "curiosity_learning", label: "🧭 Curiosity & Learning", icon: Compass, color: "text-cyan-500" },
  { value: "nature_connection", label: "🌿 Nature & Creation", icon: Leaf, color: "text-green-500" },
  { value: "creative_expression", label: "🎨 Creative Expression", icon: Palette, color: "text-purple-500" },
  { value: "failure_resilience", label: "📈 Failure & Resilience", icon: TrendingUp, color: "text-red-500" },
  { value: "relationships_depth", label: "👥 Relationships & Depth", icon: Users, color: "text-rose-500" },
  { value: "solitude_reflection", label: "🌙 Solitude & Reflection", icon: Moon, color: "text-slate-500" },
  { value: "money_contentment", label: "💰 Money & Contentment", icon: DollarSign, color: "text-emerald-500" },
  { value: "health_body", label: "💪 Health & Body", icon: Activity, color: "text-teal-500" },
  { value: "mortality_perspective", label: "⏳ Mortality & Perspective", icon: Hourglass, color: "text-gray-500" },
];

interface ThemeCoverage {
  theme: string | null;
  count: number;
}

export function FortunesManager() {
  const [fortunes, setFortunes] = useState<Fortune[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>("all");
  const [selectedFortunes, setSelectedFortunes] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(20);
  const [generateType, setGenerateType] = useState<string>("all");
  const [generateTheme, setGenerateTheme] = useState<string>("any");
  const [generateTranslation, setGenerateTranslation] = useState<string>("nlt");
  // For "all" mode, allow multi-select of which types to include
  const ALL_CONTENT_TYPES = [
    { value: "bible_verse", label: "Bible Verses", icon: Book, color: "text-blue-500" },
    { value: "proverbs", label: "Biblical Wisdom (Proverbs)", icon: Book, color: "text-teal-500" },
    { value: "affirmation", label: "Affirmations", icon: Heart, color: "text-pink-500" },
    { value: "quote", label: "Inspirational Quotes", icon: Quote, color: "text-amber-500" },
    { value: "life_lesson", label: "Life Lessons", icon: Lightbulb, color: "text-emerald-500" },
    { value: "gratitude_prompt", label: "Gratitude Prompts", icon: ThumbsUp, color: "text-purple-500" },
    { value: "discussion_starter", label: "Discussion Starters", icon: MessageCircle, color: "text-orange-500" },
  ];
  const [selectedContentTypes, setSelectedContentTypes] = useState<Set<string>>(
    new Set(ALL_CONTENT_TYPES.map(t => t.value))
  );
  const [themeCoverage, setThemeCoverage] = useState<ThemeCoverage[]>([]);
  const [showThemeCoverage, setShowThemeCoverage] = useState(false);
  const [newFortune, setNewFortune] = useState({
    content: "",
    source_type: "affirmation" as FortuneSourceType,
    author: "",
    reference: "",
  });

  useEffect(() => {
    loadFortunes();
  }, [selectedType, selectedStatus, selectedThemeFilter]);

  useEffect(() => {
    loadThemeCoverage();
  }, []);

  const loadFortunes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("daily_fortunes")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedType !== "all") {
        query = query.eq("source_type", selectedType);
      }

      if (selectedThemeFilter !== "all") {
        if (selectedThemeFilter === "none") {
          query = query.is("theme", null);
        } else {
          query = query.eq("theme", selectedThemeFilter);
        }
      }

      if (selectedStatus === "pending") {
        query = query.eq("is_approved", false).eq("is_archived", false);
      } else if (selectedStatus === "approved") {
        query = query.eq("is_approved", true).eq("is_used", false).eq("is_archived", false);
      } else if (selectedStatus === "used") {
        query = query.eq("is_used", true);
      } else if (selectedStatus === "archived") {
        query = query.eq("is_archived", true);
      } else {
        // "all" - show non-archived by default
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      setFortunes((data as Fortune[]) || []);
    } catch (error) {
      console.error("Error loading fortunes:", error);
      toast.error("Failed to load fortunes");
    } finally {
      setLoading(false);
    }
  };

  const loadThemeCoverage = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_fortunes")
        .select("theme")
        .eq("is_archived", false)
        .eq("is_approved", true);

      if (error) throw error;

      // Count by theme
      const counts: Record<string, number> = {};
      (data || []).forEach((f) => {
        const key = f.theme || "none";
        counts[key] = (counts[key] || 0) + 1;
      });

      const coverage: ThemeCoverage[] = Object.entries(counts).map(([theme, count]) => ({
        theme: theme === "none" ? null : theme,
        count,
      }));

      // Sort by count ascending (least covered first)
      coverage.sort((a, b) => a.count - b.count);

      setThemeCoverage(coverage);
    } catch (error) {
      console.error("Error loading theme coverage:", error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Only include translation for Bible-related content types
      const selectedTypesArray = Array.from(selectedContentTypes);
      const hasBibleContent = selectedTypesArray.includes("bible_verse") || selectedTypesArray.includes("proverbs");
      const includeTranslation = generateType === "bible_verse" || generateType === "proverbs" || (generateType === "all" && hasBibleContent);
      
      const response = await supabase.functions.invoke("generate-fortunes-batch", {
        body: { 
          source_type: generateType, 
          count: generateCount,
          theme: generateTheme === "any" ? null : generateTheme,
          ...(includeTranslation && { translation: generateTranslation }),
          // For "all" mode, send the selected types (if not all selected)
          ...(generateType === "all" && selectedTypesArray.length < ALL_CONTENT_TYPES.length && { selectedTypes: selectedTypesArray }),
        },
      });

      if (response.error) throw response.error;

      const themeLabel = generateTheme !== "any"
        ? THEME_OPTIONS.find(t => t.value === generateTheme)?.label 
        : null;
      
      toast.success(
        `Generated ${response.data.count} ${generateType}s${themeLabel ? ` on theme: ${themeLabel}` : ""}!`
      );
      setGenerateDialogOpen(false);
      loadFortunes();
      loadThemeCoverage();
    } catch (error) {
      console.error("Error generating fortunes:", error);
      toast.error("Failed to generate fortunes");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("daily_fortunes")
        .update({ is_approved: true })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Approved ${ids.length} fortune(s)`);
      setSelectedFortunes(new Set());
      // Optimistically remove approved items from pending view
      const idsSet = new Set(ids);
      setFortunes(prev => prev.filter(f => !idsSet.has(f.id)));
    } catch (error) {
      console.error("Error approving fortunes:", error);
      toast.error("Failed to approve fortunes");
    }
  };

  const handleReject = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("daily_fortunes")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast.success(`Deleted ${ids.length} fortune(s)`);
      setSelectedFortunes(new Set());
      // Optimistically remove deleted items from list
      const idsSet = new Set(ids);
      setFortunes(prev => prev.filter(f => !idsSet.has(f.id)));
      loadThemeCoverage();
    } catch (error) {
      console.error("Error deleting fortunes:", error);
      toast.error("Failed to delete fortunes");
    }
  };

  const handleArchive = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("daily_fortunes")
        .update({ is_archived: true })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Archived ${ids.length} fortune(s)`);
      setSelectedFortunes(new Set());
      // Optimistically remove archived items from current list instead of refetching
      // This maintains the visual order - items below simply move up
      const idsSet = new Set(ids);
      setFortunes(prev => prev.filter(f => !idsSet.has(f.id)));
    } catch (error) {
      console.error("Error archiving fortunes:", error);
      toast.error("Failed to archive fortunes");
    }
  };

  const handleUnarchive = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("daily_fortunes")
        .update({ is_archived: false })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Restored ${ids.length} fortune(s)`);
      setSelectedFortunes(new Set());
      // Optimistically remove restored items from archived view
      const idsSet = new Set(ids);
      setFortunes(prev => prev.filter(f => !idsSet.has(f.id)));
    } catch (error) {
      console.error("Error restoring fortunes:", error);
      toast.error("Failed to restore fortunes");
    }
  };

  const handleAddManual = async () => {
    if (!newFortune.content.trim()) {
      toast.error("Content is required");
      return;
    }

    try {
      const { error } = await supabase.from("daily_fortunes").insert({
        content: newFortune.content.trim(),
        source_type: newFortune.source_type,
        author: newFortune.author.trim() || null,
        reference: newFortune.reference.trim() || null,
        is_approved: true,
        is_used: false,
      });

      if (error) throw error;

      toast.success("Fortune added and approved!");
      setAddDialogOpen(false);
      setNewFortune({
        content: "",
        source_type: "affirmation",
        author: "",
        reference: "",
      });
      loadFortunes();
    } catch (error) {
      console.error("Error adding fortune:", error);
      toast.error("Failed to add fortune");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedFortunes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFortunes.size === fortunes.length) {
      setSelectedFortunes(new Set());
    } else {
      setSelectedFortunes(new Set(fortunes.map(f => f.id)));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bible_verse":
        return <Book className="h-4 w-4" />;
      case "affirmation":
        return <Heart className="h-4 w-4" />;
      case "life_lesson":
        return <Lightbulb className="h-4 w-4" />;
      case "gratitude_prompt":
        return <ThumbsUp className="h-4 w-4" />;
      case "discussion_starter":
        return <MessageCircle className="h-4 w-4" />;
      case "proverbs":
        return <Book className="h-4 w-4" />;
      default:
        return <Quote className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "bible_verse":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "affirmation":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "life_lesson":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "gratitude_prompt":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "discussion_starter":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "proverbs":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    }
  };

  const getThemeLabel = (themeValue: string | null) => {
    if (!themeValue) return null;
    const theme = THEME_OPTIONS.find(t => t.value === themeValue);
    return theme?.label || themeValue;
  };

  // Count stats
  const pendingCount = fortunes.filter(f => !f.is_approved).length;
  const approvedCount = fortunes.filter(f => f.is_approved && !f.is_used).length;

  // Get themes that need content (less than 10 items)
  const themesNeedingContent = THEME_OPTIONS.filter(t => t.value).filter(themeOption => {
    const coverage = themeCoverage.find(c => c.theme === themeOption.value);
    return !coverage || coverage.count < 10;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Fortunes Manager</h2>
          <p className="text-muted-foreground">
            Generate, review, and approve daily inspiration content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manual
          </Button>
          <Button onClick={() => setGenerateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Theme Coverage Dashboard */}
      <Collapsible open={showThemeCoverage} onOpenChange={setShowThemeCoverage}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Theme Coverage Dashboard
                  {themesNeedingContent.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {themesNeedingContent.length} need content
                    </Badge>
                  )}
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {showThemeCoverage ? "Hide" : "Show"}
                </span>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_OPTIONS.filter(t => t.value).map(themeOption => {
                  const coverage = themeCoverage.find(c => c.theme === themeOption.value);
                  const count = coverage?.count || 0;
                  const Icon = themeOption.icon;
                  const needsContent = count < 10;
                  
                  return (
                    <div
                      key={themeOption.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        needsContent 
                          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" 
                          : "border-border bg-background"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${themeOption.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {themeOption.label.replace(/^[^\s]+\s/, "")}
                        </div>
                        <div className={`text-xs ${needsContent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {count} fortune{count !== 1 ? "s" : ""}
                          {needsContent && " ⚠️ needs content"}
                        </div>
                      </div>
                      {needsContent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setGenerateTheme(themeOption.value);
                            setGenerateDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                
                {/* No theme assigned */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">No Theme Assigned</div>
                    <div className="text-xs text-muted-foreground">
                      {themeCoverage.find(c => c.theme === null)?.count || 0} fortunes
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Label>Type:</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bible_verse">Bible Verses</SelectItem>
              <SelectItem value="proverbs">Biblical Wisdom</SelectItem>
              <SelectItem value="affirmation">Affirmations</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="life_lesson">Life Lessons</SelectItem>
              <SelectItem value="gratitude_prompt">Gratitude Prompts</SelectItem>
              <SelectItem value="discussion_starter">Discussion Starters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label>Status:</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved (Unused)</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label>Theme:</Label>
          <Select value={selectedThemeFilter} onValueChange={setSelectedThemeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Themes</SelectItem>
              <SelectItem value="none">No Theme</SelectItem>
              {THEME_OPTIONS.filter(t => t.value).map(theme => (
                <SelectItem key={theme.value} value={theme.value}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={loadFortunes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedFortunes.size > 0 && (
        <div className="flex gap-2 items-center bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">
            {selectedFortunes.size} selected
          </span>
          {selectedStatus === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => handleApprove(Array.from(selectedFortunes))}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleArchive(Array.from(selectedFortunes))}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(Array.from(selectedFortunes))}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
          {selectedStatus === "archived" && (
            <>
              <Button
                size="sm"
                onClick={() => handleUnarchive(Array.from(selectedFortunes))}
              >
                <ArchiveRestore className="h-4 w-4 mr-1" />
                Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(Array.from(selectedFortunes))}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{fortunes.length}</div>
            <div className="text-sm text-muted-foreground">Total Shown</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-muted-foreground">Ready to Use</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {fortunes.filter(f => f.is_used).length}
            </div>
            <div className="text-sm text-muted-foreground">Already Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Fortunes list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : fortunes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No fortunes found. Generate some with AI or add manually!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(selectedStatus === "pending" || selectedStatus === "archived") && fortunes.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={selectedFortunes.size === fortunes.length}
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          )}

          {fortunes.map((fortune) => (
            <Card key={fortune.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {(selectedStatus === "pending" || selectedStatus === "archived") && (
                    <Checkbox
                      checked={selectedFortunes.has(fortune.id)}
                      onCheckedChange={() => toggleSelect(fortune.id)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <Badge className={getTypeBadgeColor(fortune.source_type)}>
                        {getTypeIcon(fortune.source_type)}
                        <span className="ml-1 capitalize">
                          {fortune.source_type.replace("_", " ")}
                        </span>
                      </Badge>
                      {fortune.theme && (
                        <Badge variant="outline" className="text-xs">
                          {getThemeLabel(fortune.theme)}
                        </Badge>
                      )}
                      {fortune.is_approved && (
                        <Badge variant="outline" className="text-green-600">
                          Approved
                        </Badge>
                      )}
                      {fortune.is_used && (
                        <Badge variant="secondary">Used</Badge>
                      )}
                      {fortune.is_archived && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <p className="text-foreground leading-relaxed">
                      "{fortune.content}"
                    </p>
                    {(fortune.author || fortune.reference) && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {fortune.author && `— ${fortune.author}`}
                        {fortune.reference && ` (${fortune.reference})`}
                      </p>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-col gap-1">
                    {!fortune.is_approved && !fortune.is_archived && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove([fortune.id])}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleArchive([fortune.id])}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject([fortune.id])}
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {fortune.is_archived && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleUnarchive([fortune.id])}
                          title="Restore"
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject([fortune.id])}
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Fortunes with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type of Content</Label>
              <Select value={generateType} onValueChange={setGenerateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      All Types (Custom Mix)
                    </div>
                  </SelectItem>
                  <SelectItem value="affirmation">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Affirmations
                    </div>
                  </SelectItem>
                  <SelectItem value="bible_verse">
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-blue-500" />
                      Bible Verses
                    </div>
                  </SelectItem>
                  <SelectItem value="quote">
                    <div className="flex items-center gap-2">
                      <Quote className="h-4 w-4 text-amber-500" />
                      Inspirational Quotes
                    </div>
                  </SelectItem>
                  <SelectItem value="life_lesson">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-emerald-500" />
                      Life Lessons
                    </div>
                  </SelectItem>
                  <SelectItem value="gratitude_prompt">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-purple-500" />
                      Gratitude Prompts
                    </div>
                  </SelectItem>
                  <SelectItem value="discussion_starter">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-orange-500" />
                      Discussion Starters
                    </div>
                  </SelectItem>
                  <SelectItem value="proverbs">
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-teal-500" />
                      Biblical Wisdom (Proverbs)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multi-select content types when "All Types" is selected */}
            {generateType === "all" && (
              <div className="space-y-2">
                <Label>Content Types to Include</Label>
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  {ALL_CONTENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedContentTypes.has(type.value);
                    return (
                      <div 
                        key={type.value} 
                        className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1.5 rounded"
                        onClick={() => {
                          setSelectedContentTypes(prev => {
                            const next = new Set(prev);
                            if (next.has(type.value)) {
                              // Don't allow deselecting all
                              if (next.size > 1) {
                                next.delete(type.value);
                              }
                            } else {
                              next.add(type.value);
                            }
                            return next;
                          });
                        }}
                      >
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={() => {}} // Handled by parent onClick
                          className="pointer-events-none"
                        />
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        <span className="text-sm">{type.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deselect types you don't want in this batch. At least one must be selected.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Theme (Optional)</Label>
              <Select value={generateTheme} onValueChange={setGenerateTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme..." />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map(theme => {
                    const Icon = theme.icon;
                    const coverage = themeCoverage.find(c => c.theme === (theme.value || null));
                    const count = coverage?.count || 0;
                    const needsContent = theme.value && count < 10;
                    
                    return (
                      <SelectItem key={theme.value || "any"} value={theme.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${theme.color}`} />
                          <span>{theme.label}</span>
                          {theme.value && (
                            <span className={`text-xs ml-1 ${needsContent ? "text-amber-600" : "text-muted-foreground"}`}>
                              ({count})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a theme to generate focused content on specific life topics.
              </p>
            </div>

            {/* Bible Translation - only show for Bible-related content */}
            {(generateType === "bible_verse" || generateType === "proverbs" || 
              (generateType === "all" && (selectedContentTypes.has("bible_verse") || selectedContentTypes.has("proverbs")))) && (
              <div className="space-y-2">
                <Label>Bible Translation</Label>
                <Select value={generateTranslation} onValueChange={setGenerateTranslation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nlt">
                      <div className="flex flex-col">
                        <span className="font-medium">NLT - New Living Translation</span>
                        <span className="text-xs text-muted-foreground">Very easy to read, thought-for-thought</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="niv">
                      <div className="flex flex-col">
                        <span className="font-medium">NIV - New International Version</span>
                        <span className="text-xs text-muted-foreground">Balance of accuracy and readability</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="esv">
                      <div className="flex flex-col">
                        <span className="font-medium">ESV - English Standard Version</span>
                        <span className="text-xs text-muted-foreground">Accurate, slightly more formal</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="csb">
                      <div className="flex flex-col">
                        <span className="font-medium">CSB - Christian Standard Bible</span>
                        <span className="text-xs text-muted-foreground">Modern, clear language</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="msg">
                      <div className="flex flex-col">
                        <span className="font-medium">The Message</span>
                        <span className="text-xs text-muted-foreground">Paraphrase, very casual/conversational</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="kjv">
                      <div className="flex flex-col">
                        <span className="font-medium">KJV - King James Version</span>
                        <span className="text-xs text-muted-foreground">Classic, beautiful but archaic language</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  NLT recommended for easier understanding. Used for Bible Verses and Proverbs.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Number to Generate</Label>
              <Input
                type="number"
                min={5}
                max={50}
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-muted-foreground">
                Generate 5-50 at a time. They will need approval before use.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
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

      {/* Add Manual Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fortune Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newFortune.source_type}
                onValueChange={(v) =>
                  setNewFortune({ ...newFortune, source_type: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="affirmation">Affirmation</SelectItem>
                  <SelectItem value="bible_verse">Bible Verse</SelectItem>
                  <SelectItem value="proverbs">Biblical Wisdom</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="life_lesson">Life Lesson</SelectItem>
                  <SelectItem value="gratitude_prompt">Gratitude Prompt</SelectItem>
                  <SelectItem value="discussion_starter">Discussion Starter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={newFortune.content}
                onChange={(e) =>
                  setNewFortune({ ...newFortune, content: e.target.value })
                }
                placeholder="Enter the fortune content..."
                rows={3}
              />
            </div>

            {newFortune.source_type === "quote" && (
              <div className="space-y-2">
                <Label>Author (optional)</Label>
                <Input
                  value={newFortune.author}
                  onChange={(e) =>
                    setNewFortune({ ...newFortune, author: e.target.value })
                  }
                  placeholder="e.g., Maya Angelou"
                />
              </div>
            )}

            {newFortune.source_type === "bible_verse" && (
              <div className="space-y-2">
                <Label>Reference (optional)</Label>
                <Input
                  value={newFortune.reference}
                  onChange={(e) =>
                    setNewFortune({ ...newFortune, reference: e.target.value })
                  }
                  placeholder="e.g., John 3:16"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManual}>
              <Plus className="h-4 w-4 mr-2" />
              Add & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
