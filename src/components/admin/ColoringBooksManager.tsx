import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Loader2, Coins, BookOpen, Wand2, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

interface BookIdea {
  title: string;
  description: string;
}

export function ColoringBooksManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    generation_prompt: "",
    coin_price: 0,
    is_free: true,
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showFullCoverPrompt, setShowFullCoverPrompt] = useState(false);
  const [fullCoverPrompt, setFullCoverPrompt] = useState("");
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [bookIdeas, setBookIdeas] = useState<BookIdea[]>([]);

  const DEFAULT_COVER_PROMPT_TEMPLATE = `Create a FULL-COLOR children's coloring book cover that looks like a REAL PUBLISHED COLORING BOOK for the theme: "{THEME}".

STYLE REFERENCE - Make it look like professional children's coloring book covers you'd find in stores:
- DECORATIVE THEMED BORDER around the edges (flowers, vines, stars, themed elements that match the topic)
- BIG STYLIZED TITLE TEXT at the top: "{THEME}" in fun, whimsical, colorful bubble/fancy letters
- SUBTITLE below the title like "A Magical Coloring Adventure!" or "Coloring Book!" in a banner or ribbon
- CENTRAL ILLUSTRATION featuring cute cartoon characters/scenes related to the theme
- SCATTERED THEMED ELEMENTS throughout (small icons, doodles, decorations related to the theme)

CRITICAL LAYOUT:
- Square 1:1 aspect ratio
- Full-bleed artwork extending to ALL edges - no white margins
- The decorative border elements should touch all four edges
- Bright, cheerful, pastel-friendly color palette
- Kawaii/chibi cute art style for characters
- Whimsical, magical, child-friendly aesthetic

THIS IS A FULL-COLOR COVER - NOT a coloring page. Make it look like a finished, polished, commercial coloring book cover that would attract children.

OUTPUT: High quality, print-ready, no watermarks.`;

  const buildFullCoverPrompt = (theme: string): string => {
    return DEFAULT_COVER_PROMPT_TEMPLATE.replace(/\{THEME\}/g, theme);
  };

  const updateFullCoverPrompt = (theme: string) => {
    if (!showFullCoverPrompt || !fullCoverPrompt) {
      setFullCoverPrompt(buildFullCoverPrompt(theme));
    }
  };

  const { data: books, isLoading } = useQuery({
    queryKey: ["admin-coloring-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select("*, coloring_pages!inner(count)")
        .order("display_order", { ascending: true });
      if (error) throw error;
      
      // Fetch active page counts separately since we need to filter by is_active
      const booksWithCounts = await Promise.all(
        data.map(async (book: any) => {
          const { count } = await supabase
            .from("coloring_pages")
            .select("*", { count: "exact", head: true })
            .eq("book_id", book.id)
            .eq("is_active", true);
          return { ...book, active_page_count: count || 0 };
        })
      );
      
      return booksWithCounts;
    },
  });

  const generateCover = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("generate-coloring-book-cover", {
      body: { prompt },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateCover = async () => {
    if (!aiPrompt.trim() && !fullCoverPrompt.trim()) {
      toast.error("Please enter a description for the cover");
      return;
    }
    
    setGeneratingImage(true);
    try {
      // Use the full prompt if customized, otherwise use the template with theme
      const promptToUse = showFullCoverPrompt && fullCoverPrompt 
        ? fullCoverPrompt 
        : buildFullCoverPrompt(aiPrompt);
      const imageUrl = await generateCover(promptToUse);
      setGeneratedImageUrl(imageUrl);
      setImageFile(null);
      toast.success("Cover generated!");
    } catch (error) {
      showErrorToastWithCopy("Generating cover", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Priority: uploaded file > newly generated image > existing cover
      let coverUrl = generatedImageUrl || editingBook?.cover_image_url;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`coloring-books/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`coloring-books/${fileName}`);
        coverUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (!coverUrl) throw new Error("Cover image is required");

      const payload = { 
        ...data, 
        cover_image_url: coverUrl,
        coin_price: data.is_free ? 0 : data.coin_price,
      };

      if (editingBook) {
        const { error } = await supabase
          .from("coloring_books")
          .update(payload)
          .eq("id", editingBook.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coloring_books").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success(editingBook ? "Book updated!" : "Book created!");
      handleCloseDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving book", error);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coloring_books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success("Book deleted!");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coloring_books")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBook(null);
    setFormData({ title: "", description: "", generation_prompt: "", coin_price: 0, is_free: true, display_order: 0 });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setAiPrompt("");
    setShowFullCoverPrompt(false);
    setFullCoverPrompt("");
  };

  const handleEdit = (book: any) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      description: book.description || "",
      generation_prompt: book.generation_prompt || "",
      coin_price: book.coin_price || 0,
      is_free: book.is_free,
      display_order: book.display_order || 0,
    });
    setAiPrompt(book.title);
    setImageFile(null);
    setGeneratedImageUrl(null);
    setShowFullCoverPrompt(false);
    setFullCoverPrompt(buildFullCoverPrompt(book.title));
    setDialogOpen(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-coloring-book-description", {
        body: { bookTitle: formData.title },
      });
      
      if (error) throw error;
      if (data.description) {
        setFormData({ ...formData, description: data.description });
        toast.success("Description generated!");
      }
    } catch (error) {
      showErrorToastWithCopy("Generating description", error);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const generateBookIdeas = async () => {
    setGeneratingIdeas(true);
    try {
      const existingTitles = books?.map((b: any) => b.title) || [];
      const { data, error } = await supabase.functions.invoke("generate-coloring-book-ideas", {
        body: { existingTitles },
      });

      if (error) throw error;
      if (data?.ideas && Array.isArray(data.ideas)) {
        setBookIdeas(data.ideas);
        toast.success(`Generated ${data.ideas.length} book ideas!`);
      }
    } catch (error) {
      showErrorToastWithCopy("Generating book ideas", error);
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const selectBookIdea = (idea: BookIdea) => {
    setFormData({
      title: idea.title,
      description: idea.description,
      generation_prompt: "",
      coin_price: 0,
      is_free: true,
      display_order: 0,
    });
    setAiPrompt(idea.title);
    setIdeasOpen(false);
    setEditingBook(null);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Coloring Books
        </CardTitle>
        <div className="flex gap-2">
          {/* Ideas Popover */}
          <Popover open={ideasOpen} onOpenChange={setIdeasOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Lightbulb className="w-4 h-4" /> Ideas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Book Ideas</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateBookIdeas}
                    disabled={generatingIdeas}
                    className="h-7 gap-1"
                  >
                    {generatingIdeas ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click an idea to start creating a new book
                </p>
              </div>
              <ScrollArea className="h-72">
                {bookIdeas.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Click "Generate" to get AI-powered book ideas
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {bookIdeas.map((idea, index) => (
                      <button
                        key={index}
                        onClick={() => selectBookIdea(idea)}
                        className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <p className="font-medium text-sm">{idea.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {idea.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Add Book Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Book
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBook ? "Edit" : "Add"} Coloring Book</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!aiPrompt) setAiPrompt(e.target.value);
                  }}
                  placeholder="e.g., Animal Friends"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !formData.title.trim()}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {generatingDescription ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    Generate
                  </Button>
                </div>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this book about?"
                  rows={2}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-2 bg-primary/5">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Generation Prompt (Theme for AI Pages)
                </Label>
                <Textarea
                  value={formData.generation_prompt}
                  onChange={(e) => setFormData({ ...formData, generation_prompt: e.target.value })}
                  placeholder="e.g., 'cute cartoon animals in natural outdoor scenes with trees, flowers, and sunshine' - this will be combined with each page's title when generating images"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This theme is combined with each page title when generating AI images. Example: If this says "in a magical forest" and a page is titled "Bunny", the AI will generate "Bunny in a magical forest".
                </p>
              </div>

              {/* Pricing */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Free Book
                  </Label>
                  <Switch
                    checked={formData.is_free}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                  />
                </div>
                {!formData.is_free && (
                  <div>
                    <Label>Price (coins)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.coin_price}
                      onChange={(e) => setFormData({ ...formData, coin_price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* AI Cover Generation */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Generate Cover with AI
                </Label>
                
                {/* Theme/Subject Input */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Cover Theme</Label>
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => {
                        setAiPrompt(e.target.value);
                        updateFullCoverPrompt(e.target.value);
                      }}
                      placeholder="e.g., cute animals playing together"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleGenerateCover}
                      disabled={generatingImage || (!aiPrompt.trim() && !fullCoverPrompt.trim())}
                      variant="secondary"
                    >
                      {generatingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Toggle for Full Prompt - Editable AI Prompt */}
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowFullCoverPrompt(!showFullCoverPrompt);
                      if (!showFullCoverPrompt && !fullCoverPrompt) {
                        setFullCoverPrompt(buildFullCoverPrompt(aiPrompt || "your theme"));
                      }
                    }}
                    className="text-xs h-8 gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    {showFullCoverPrompt ? "Hide Full Prompt" : "Show Full Prompt (Advanced)"}
                  </Button>
                </div>

                {/* Full Prompt Editor */}
                {showFullCoverPrompt && (
                  <div className="space-y-2">
                    <Textarea
                      value={fullCoverPrompt}
                      onChange={(e) => setFullCoverPrompt(e.target.value)}
                      rows={12}
                      className="text-xs font-mono"
                      placeholder="Full prompt for cover generation..."
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFullCoverPrompt(buildFullCoverPrompt(aiPrompt || "your theme"))}
                        className="text-xs h-7"
                      >
                        Reset to Default Template
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use {"{THEME}"} as a placeholder for the cover theme entered above.
                    </p>
                  </div>
                )}

                {generatedImageUrl && (
                  <div className="relative">
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated" 
                      className="w-full max-w-xs mx-auto rounded border"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">AI Generated Cover</p>
                  </div>
                )}
              </div>

              {/* Or Upload */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or upload</span>
                </div>
              </div>

              {/* Current Cover Preview */}
              {editingBook?.cover_image_url && !imageFile && !generatedImageUrl && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <Label className="text-sm text-muted-foreground mb-2 block">Current Cover</Label>
                  <img 
                    src={editingBook.cover_image_url} 
                    alt="Current cover" 
                    className="w-full max-w-xs mx-auto rounded border"
                  />
                </div>
              )}

              <div>
                <Label>Upload Cover Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setImageFile(e.target.files?.[0] || null);
                    if (e.target.files?.[0]) setGeneratedImageUrl(null);
                  }}
                />
                {imageFile && (
                  <img 
                    src={URL.createObjectURL(imageFile)} 
                    alt="Preview" 
                    className="mt-2 w-32 h-40 object-cover rounded"
                  />
                )}
              </div>

              <Button type="submit" disabled={saveMutation.isPending || uploading || generatingImage} className="w-full">
                {uploading ? "Uploading..." : saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !books?.length ? (
          <p className="text-muted-foreground">No coloring books yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {books.map((book: any) => (
              <div key={book.id} className="relative group border rounded-lg overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <img 
                    src={book.cover_image_url} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                  />
                  {!book.is_free && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {book.coin_price}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="font-medium text-sm truncate">{book.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {book.active_page_count} pages
                  </p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-background/80"
                    onClick={() => toggleActiveMutation.mutate({ id: book.id, is_active: !book.is_active })}
                    title={book.is_active ? "Hide" : "Show"}
                  >
                    {book.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-600" />}
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => handleEdit(book)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => deleteMutation.mutate(book.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}