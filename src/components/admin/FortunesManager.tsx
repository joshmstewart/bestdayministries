import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

type FortuneSourceType = "bible_verse" | "affirmation" | "quote" | "life_lesson" | "gratitude_prompt" | "discussion_starter" | "proverbs";

interface Fortune {
  id: string;
  content: string;
  source_type: FortuneSourceType;
  author: string | null;
  reference: string | null;
  is_approved: boolean;
  is_used: boolean;
  is_archived: boolean;
  used_date: string | null;
  created_at: string;
}

export function FortunesManager() {
  const [fortunes, setFortunes] = useState<Fortune[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [selectedFortunes, setSelectedFortunes] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateCount, setGenerateCount] = useState(20);
  const [generateType, setGenerateType] = useState<string>("affirmation");
  const [newFortune, setNewFortune] = useState({
    content: "",
    source_type: "affirmation" as FortuneSourceType,
    author: "",
    reference: "",
  });

  useEffect(() => {
    loadFortunes();
  }, [selectedType, selectedStatus]);

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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-fortunes-batch", {
        body: { source_type: generateType, count: generateCount },
      });

      if (response.error) throw response.error;

      toast.success(`Generated ${response.data.count} ${generateType}s!`);
      setGenerateDialogOpen(false);
      loadFortunes();
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
      loadFortunes();
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
      loadFortunes();
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
      loadFortunes();
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

  // Count stats
  const pendingCount = fortunes.filter(f => !f.is_approved).length;
  const approvedCount = fortunes.filter(f => f.is_approved && !f.is_used).length;

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
        <DialogContent>
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
