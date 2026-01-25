import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, Edit, Eye, EyeOff, Sparkles, Loader2, RefreshCw, 
  BookOpen, Coins, ImageOff, Wand2, Check, Upload, Archive, ArchiveRestore
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

interface ColoringBook {
  id: string;
  title: string;
  description: string | null;
  generation_prompt: string | null;
  cover_image_url: string;
  coin_price: number;
  is_free: boolean;
  is_active: boolean;
  display_order: number;
}

interface ColoringPage {
  id: string;
  book_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  difficulty: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

export function ColoringManager() {
  const queryClient = useQueryClient();
  
  // Book state
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ColoringBook | null>(null);
  const [bookFormData, setBookFormData] = useState({
    title: "",
    description: "",
    generation_prompt: "",
    coin_price: 0,
    is_free: true,
    display_order: 0,
  });
  const [bookImageFile, setBookImageFile] = useState<File | null>(null);
  const [bookUploading, setBookUploading] = useState(false);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Page state
  const [bookPages, setBookPages] = useState<Record<string, ColoringPage[]>>({});
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [uploadingPageFor, setUploadingPageFor] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [editingPage, setEditingPage] = useState<ColoringPage | null>(null);
  const [editPageName, setEditPageName] = useState("");

  // Idea generation state
  const [generatingIdeas, setGeneratingIdeas] = useState<string | null>(null);
  const [pageIdeas, setPageIdeas] = useState<Record<string, string[]>>({});
  const [selectedIdeas, setSelectedIdeas] = useState<Record<string, Set<string>>>({});
  const [generatingFromIdeas, setGeneratingFromIdeas] = useState<string | null>(null);
  
  // Filter state - hide archived by default
  const [showArchived, setShowArchived] = useState(false);
  const [ideaProgress, setIdeaProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch books
  const { data: books, isLoading } = useQuery({
    queryKey: ["admin-coloring-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as ColoringBook[];
    },
  });

  // Fetch pages for each book
  useEffect(() => {
    if (books) {
      books.forEach(async (book) => {
        const { data, error } = await supabase
          .from("coloring_pages")
          .select("*")
          .eq("book_id", book.id)
          .order("display_order", { ascending: true });
        if (!error && data) {
          setBookPages((prev) => ({ ...prev, [book.id]: data }));
        }
      });
    }
  }, [books]);

  // Generate description from title
  const handleGenerateDescription = async () => {
    if (!bookFormData.title.trim()) {
      toast.error("Please enter a title first");
      return;
    }
    
    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-coloring-book-description", {
        body: { bookTitle: bookFormData.title },
      });

      if (error) throw error;
      
      if (data?.description) {
        setBookFormData(prev => ({ ...prev, description: data.description }));
        toast.success("Description generated!");
      }
    } catch (error: any) {
      showErrorToastWithCopy("Failed to generate description", error);
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Generate cover image (COVER logic is intentionally separate from page generation)
  const generateCover = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("generate-coloring-book-cover", {
      body: { prompt },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  // Generate coloring page image
  const generatePageImage = async (prompt: string, bookId?: string | null): Promise<string> => {
    const bookTheme = bookId ? books?.find((b) => b.id === bookId)?.generation_prompt : null;
    const subject = bookTheme ? `${prompt}. Theme/context: ${bookTheme}` : prompt;

    const fullPrompt = `Create a coloring book page line drawing. Subject: ${subject}.

ABSOLUTELY CRITICAL - BLACK AND WHITE ONLY:
- ONLY black lines on a pure white background - NO COLOR WHATSOEVER
- No gray, no shading, no gradients, no colored fills - ONLY black outlines
- This is a coloring page - users will add their own colors

DRAWING REQUIREMENTS:
- ONLY draw the subject itself - no decorative elements like stars, hearts, swirls unless they are part of the subject
- NO text, words, letters, titles, or captions anywhere
- NO decorative borders or frames
- ALL outlines must be FULLY CLOSED with no gaps (for paint bucket fill tools)
- Thick, clean black outlines only
- Simple cartoon style suitable for children to color
- Subject should fill most of the image`;

    const { data, error } = await supabase.functions.invoke("generate-coloring-page", {
      body: { prompt: fullPrompt },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateCover = async (bookId?: string) => {
    const prompt = bookId ? books?.find(b => b.id === bookId)?.title : coverPrompt;
    if (!prompt?.trim()) return;
    
    setGeneratingCover(bookId || "new");
    try {
      const imageUrl = await generateCover(prompt);
      
      if (bookId) {
        // Update existing book
        const { error } = await supabase
          .from("coloring_books")
          .update({ cover_image_url: imageUrl })
          .eq("id", bookId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
        toast.success("Cover regenerated!");
      } else {
        // For new book dialog
        setGeneratedCoverUrl(imageUrl);
        setBookImageFile(null);
        toast.success("Cover generated!");
      }
    } catch (error) {
      showErrorToastWithCopy("Generating cover", error);
    } finally {
      setGeneratingCover(null);
    }
  };

  // Add page and generate image
  const handleAddPage = async (bookId: string) => {
    if (!newPageName.trim()) return;
    
    setAddingPage(true);
    try {
      // Generate the image first
      const imageUrl = await generatePageImage(newPageName, bookId);
      
      // Then insert the page with the image
      const { error: insertError } = await supabase
        .from("coloring_pages")
        .insert({
          title: newPageName,
          book_id: bookId,
          description: newPageName,
          image_url: imageUrl,
          display_order: (bookPages[bookId]?.length || 0),
        });
      
      if (insertError) throw insertError;
      
      // Refresh pages
      const { data: pages } = await supabase
        .from("coloring_pages")
        .select("*")
        .eq("book_id", bookId)
        .order("display_order", { ascending: true });
      
      if (pages) {
        setBookPages((prev) => ({ ...prev, [bookId]: pages }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      setNewPageName("");
      toast.success("Page added!");
    } catch (error) {
      showErrorToastWithCopy("Adding page", error);
    } finally {
      setAddingPage(false);
    }
  };

  // Upload page image
  const handleUploadPage = async (bookId: string, file: File, title: string) => {
    setUploadingPageFor(bookId);
    try {
      const compressed = await compressImage(file);
      const sanitizedName = file.name.replace(/\s+/g, '_');
      const fileName = `${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(`coloring-pages/${fileName}`, compressed);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(`coloring-pages/${fileName}`);
      
      const { error: insertError } = await supabase
        .from("coloring_pages")
        .insert({
          title: title || file.name.replace(/\.[^/.]+$/, ""),
          book_id: bookId,
          image_url: urlData.publicUrl,
          display_order: (bookPages[bookId]?.length || 0),
        });
      
      if (insertError) throw insertError;
      
      // Refresh pages
      const { data: pages } = await supabase
        .from("coloring_pages")
        .select("*")
        .eq("book_id", bookId)
        .order("display_order", { ascending: true });
      
      if (pages) {
        setBookPages((prev) => ({ ...prev, [bookId]: pages }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      setNewPageName("");
      toast.success("Page uploaded!");
    } catch (error) {
      showErrorToastWithCopy("Uploading page", error);
    } finally {
      setUploadingPageFor(null);
    }
  };

  const handleRegeneratePage = async (page: ColoringPage) => {
    setRegeneratingId(page.id);
    try {
      const imageUrl = await generatePageImage(page.description || page.title, page.book_id);
      
      const { error } = await supabase
        .from("coloring_pages")
        .update({ image_url: imageUrl })
        .eq("id", page.id);
      
      if (error) throw error;
      
      // Refresh pages for this book
      if (page.book_id) {
        const { data: pages } = await supabase
          .from("coloring_pages")
          .select("*")
          .eq("book_id", page.book_id)
          .order("display_order", { ascending: true });
        
        if (pages) {
          setBookPages((prev) => ({ ...prev, [page.book_id!]: pages }));
        }
      }
      
      toast.success("Image regenerated!");
    } catch (error) {
      showErrorToastWithCopy("Regenerating image", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Archive/restore page (instead of delete)
  const handleTogglePageActive = async (page: ColoringPage) => {
    const newActiveState = !page.is_active;
    try {
      const { error } = await supabase
        .from("coloring_pages")
        .update({ is_active: newActiveState })
        .eq("id", page.id);
      
      if (error) throw error;
      
      if (page.book_id) {
        setBookPages((prev) => ({
          ...prev,
          [page.book_id!]: prev[page.book_id!]?.map((p) =>
            p.id === page.id ? { ...p, is_active: newActiveState } : p
          ) || [],
        }));
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success(newActiveState ? "Page restored!" : "Page archived!");
    } catch (error) {
      showErrorToastWithCopy(newActiveState ? "Restoring page" : "Archiving page", error);
    }
  };

  // Update page name
  const handleUpdatePageName = async (page: ColoringPage, newName: string) => {
    if (!newName.trim()) {
      toast.error("Page name cannot be empty");
      return;
    }
    try {
      const { error } = await supabase
        .from("coloring_pages")
        .update({ title: newName.trim() })
        .eq("id", page.id);
      
      if (error) throw error;
      
      if (page.book_id) {
        setBookPages((prev) => ({
          ...prev,
          [page.book_id!]: prev[page.book_id!]?.map((p) =>
            p.id === page.id ? { ...p, title: newName.trim() } : p
          ) || [],
        }));
      }
      
      setEditingPage(null);
      setEditPageName("");
      toast.success("Page name updated!");
    } catch (error) {
      showErrorToastWithCopy("Updating page name", error);
    }
  };


  const handleGenerateIdeas = async (book: ColoringBook) => {
    setGeneratingIdeas(book.id);
    try {
      // Get existing active page titles to exclude from suggestions
      const existingPages = bookPages[book.id] || [];
      const existingTitles = existingPages
        .filter(page => page.is_active !== false) // Only exclude active pages, archived can be suggested again
        .map(page => page.title);
      
      const { data, error } = await supabase.functions.invoke("generate-coloring-page-ideas", {
        body: { 
          bookTitle: book.title, 
          bookDescription: book.description,
          bookTheme: book.generation_prompt,
          existingTitles: existingTitles,
        },
      });
      
      if (error) throw error;
      
      setPageIdeas((prev) => ({ ...prev, [book.id]: data.ideas || [] }));
      setSelectedIdeas((prev) => ({ ...prev, [book.id]: new Set() }));
      toast.success(`Generated ${data.ideas?.length || 0} page ideas!`);
    } catch (error) {
      showErrorToastWithCopy("Generating ideas", error);
    } finally {
      setGeneratingIdeas(null);
    }
  };

  // Toggle idea selection
  const toggleIdeaSelection = (bookId: string, idea: string) => {
    setSelectedIdeas((prev) => {
      const current = prev[bookId] || new Set();
      const newSet = new Set(current);
      if (newSet.has(idea)) {
        newSet.delete(idea);
      } else {
        newSet.add(idea);
      }
      return { ...prev, [bookId]: newSet };
    });
  };

  // Select/deselect all ideas
  const toggleAllIdeas = (bookId: string, selectAll: boolean) => {
    const ideas = pageIdeas[bookId] || [];
    setSelectedIdeas((prev) => ({
      ...prev,
      [bookId]: selectAll ? new Set(ideas) : new Set(),
    }));
  };

  // Generate pages from selected ideas
  const handleGenerateFromIdeas = async (bookId: string) => {
    const selected = Array.from(selectedIdeas[bookId] || []);
    if (selected.length === 0) {
      toast.error("Select at least one idea to generate");
      return;
    }
    
    setGeneratingFromIdeas(bookId);
    setIdeaProgress({ current: 0, total: selected.length });
    
    let successCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const idea = selected[i];
      setIdeaProgress({ current: i + 1, total: selected.length });
      
      try {
        const imageUrl = await generatePageImage(idea, bookId);
        
        const { error: insertError } = await supabase
          .from("coloring_pages")
          .insert({
            title: idea,
            book_id: bookId,
            description: idea,
            image_url: imageUrl,
            display_order: (bookPages[bookId]?.length || 0) + i,
          });
        
        if (insertError) throw insertError;
        successCount++;
      } catch (error) {
        console.error(`Failed to generate page for "${idea}":`, error);
      }
    }
    
    // Refresh pages
    const { data: pages } = await supabase
      .from("coloring_pages")
      .select("*")
      .eq("book_id", bookId)
      .order("display_order", { ascending: true });
    
    if (pages) {
      setBookPages((prev) => ({ ...prev, [bookId]: pages }));
    }
    
    // Clear selected ideas that were generated
    setSelectedIdeas((prev) => ({ ...prev, [bookId]: new Set() }));
    setPageIdeas((prev) => {
      const remaining = (prev[bookId] || []).filter((idea) => !selected.includes(idea));
      return { ...prev, [bookId]: remaining };
    });
    
    queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
    setGeneratingFromIdeas(null);
    setIdeaProgress(null);
    toast.success(`Generated ${successCount} of ${selected.length} pages!`);
  };
  const saveBookMutation = useMutation({
    mutationFn: async (data: typeof bookFormData) => {
      // Priority: uploaded file > newly generated cover > existing cover
      let coverUrl = generatedCoverUrl || editingBook?.cover_image_url;

      if (bookImageFile) {
        setBookUploading(true);
        const compressed = await compressImage(bookImageFile);
        const fileName = `${Date.now()}-${bookImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`coloring-books/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`coloring-books/${fileName}`);
        coverUrl = urlData.publicUrl;
        setBookUploading(false);
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
      handleCloseBookDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving book", error);
      setBookUploading(false);
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coloring_books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success("Book deleted!");
    },
  });

  const toggleBookActiveMutation = useMutation({
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

  const handleCloseBookDialog = () => {
    setBookDialogOpen(false);
    setEditingBook(null);
    setBookFormData({ title: "", description: "", generation_prompt: "", coin_price: 0, is_free: true, display_order: 0 });
    setBookImageFile(null);
    setGeneratedCoverUrl(null);
    setCoverPrompt("");
  };

  const handleEditBook = (book: ColoringBook) => {
    setEditingBook(book);
    setBookFormData({
      title: book.title,
      description: book.description || "",
      generation_prompt: book.generation_prompt || "",
      coin_price: book.coin_price || 0,
      is_free: book.is_free,
      display_order: book.display_order || 0,
    });
    setCoverPrompt(book.title);
    setBookImageFile(null);
    setGeneratedCoverUrl(null);
    setBookDialogOpen(true);
  };

  const handleSubmitBook = (e: React.FormEvent) => {
    e.preventDefault();
    saveBookMutation.mutate(bookFormData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Coloring Books
        </CardTitle>
        <Button onClick={() => setBookDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Book
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !books?.length ? (
          <p className="text-muted-foreground">No coloring books yet. Create your first book above.</p>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {books.map((book) => {
              const allPages = bookPages[book.id] || [];
              const archivedCount = allPages.filter(p => p.is_active === false).length;
              const pages = showArchived ? allPages : allPages.filter(p => p.is_active !== false);
              const missingCount = allPages.filter((p) => p.is_active !== false && !p.image_url).length;
              
              return (
                <AccordionItem key={book.id} value={book.id} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border flex-shrink-0">
                        {book.cover_image_url ? (
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <ImageOff className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{book.title}</span>
                          {!book.is_active && (
                            <Badge variant="secondary" className="text-xs">Hidden</Badge>
                          )}
                          {book.is_free ? (
                            <Badge variant="outline" className="text-xs">Free</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs gap-1">
                              <Coins className="w-3 h-3" />
                              {book.coin_price}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {allPages.filter(p => p.is_active !== false).length} pages
                          {archivedCount > 0 && <span className="text-muted-foreground/70"> (+{archivedCount} archived)</span>}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pb-4">
                    {/* Cover Section */}
                    <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        📖 Book Cover
                      </h4>
                      <div className="flex items-start gap-4">
                        {book.cover_image_url ? (
                          <div className="relative group rounded-lg border-2 border-primary overflow-hidden w-24 h-32 flex-shrink-0">
                            <img
                              src={book.cover_image_url}
                              alt={`${book.title} Cover`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setPreviewImage({ url: book.cover_image_url, name: `${book.title} Cover` })}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage({ url: book.cover_image_url, name: `${book.title} Cover` });
                                }}
                                className="text-xs h-7"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateCover(book.id);
                                }}
                                disabled={generatingCover === book.id}
                                className="text-xs h-7"
                              >
                                {generatingCover === book.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regen
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 w-24 h-32 flex-shrink-0 flex items-center justify-center bg-muted">
                            <ImageOff className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            {book.cover_image_url 
                              ? "Hover over the cover to regenerate it with a new design."
                              : "Generate a themed cover for this coloring book."}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateCover(book.id)}
                            disabled={generatingCover === book.id}
                          >
                            {generatingCover === book.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-1" />
                                {book.cover_image_url ? "Regenerate Cover" : "Generate Cover"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Book Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleBookActiveMutation.mutate({ id: book.id, is_active: !book.is_active })}
                      >
                        {book.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBook(book)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Book
                      </Button>
                      {missingCount === 0 && pages.length > 0 && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          All pages generated
                        </span>
                      )}
                    </div>

                    {/* Add New Page */}
                    <div className="space-y-3 mb-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter page name (e.g., Cute Puppy, Rainbow...)"
                          value={activeBookId === book.id ? newPageName : ""}
                          onChange={(e) => {
                            setActiveBookId(book.id);
                            setNewPageName(e.target.value);
                          }}
                          onFocus={() => setActiveBookId(book.id)}
                          disabled={addingPage || uploadingPageFor === book.id}
                        />
                        <Button
                          onClick={() => handleAddPage(book.id)}
                          disabled={!newPageName.trim() || addingPage || activeBookId !== book.id || uploadingPageFor === book.id}
                        >
                          {addingPage && activeBookId === book.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Add & Generate
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Upload option */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleUploadPage(book.id, file, newPageName);
                              }
                              e.target.value = '';
                            }}
                            disabled={uploadingPageFor === book.id || addingPage}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingPageFor === book.id || addingPage}
                          >
                            {uploadingPageFor === book.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-1" />
                                Upload Image
                              </>
                            )}
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {newPageName.trim() ? `Upload as "${newPageName}"` : "Uses filename as name (or enter name above first)"}
                        </span>
                      </div>

                      {/* Idea Wand Section */}
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-primary" />
                            Page Ideas
                          </h5>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateIdeas(book)}
                            disabled={generatingIdeas === book.id || generatingFromIdeas === book.id}
                          >
                            {generatingIdeas === book.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-1" />
                                {pageIdeas[book.id]?.length ? "Refresh Ideas" : "Generate Ideas"}
                              </>
                            )}
                          </Button>
                        </div>

                        {pageIdeas[book.id]?.length > 0 && (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                {selectedIdeas[book.id]?.size || 0} of {pageIdeas[book.id].length} selected
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAllIdeas(book.id, true)}
                                  className="text-xs h-7"
                                >
                                  Select All
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAllIdeas(book.id, false)}
                                  className="text-xs h-7"
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {pageIdeas[book.id].map((idea) => {
                                const isSelected = selectedIdeas[book.id]?.has(idea);
                                return (
                                  <Badge
                                    key={idea}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected ? "" : "hover:bg-muted"
                                    }`}
                                    onClick={() => toggleIdeaSelection(book.id, idea)}
                                  >
                                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                                    {idea}
                                  </Badge>
                                );
                              })}
                            </div>

                            {ideaProgress && generatingFromIdeas === book.id && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Generating pages...</span>
                                  <span>{ideaProgress.current} / {ideaProgress.total}</span>
                                </div>
                                <Progress value={(ideaProgress.current / ideaProgress.total) * 100} />
                              </div>
                            )}

                            <Button
                              onClick={() => handleGenerateFromIdeas(book.id)}
                              disabled={
                                !selectedIdeas[book.id]?.size ||
                                generatingFromIdeas === book.id ||
                                generatingIdeas === book.id
                              }
                            >
                              {generatingFromIdeas === book.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Generating {ideaProgress?.current || 0}/{ideaProgress?.total || 0}...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Generate {selectedIdeas[book.id]?.size || 0} Selected Pages
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {!pageIdeas[book.id]?.length && !generatingIdeas && (
                          <p className="text-xs text-muted-foreground">
                            Use AI to generate page ideas based on "{book.title}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pages Filter & Grid */}
                    {archivedCount > 0 && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                          {pages.length} {showArchived ? 'total' : 'active'} pages
                          {!showArchived && archivedCount > 0 && ` (${archivedCount} archived)`}
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`show-archived-${book.id}`}
                            checked={showArchived}
                            onCheckedChange={setShowArchived}
                          />
                          <Label htmlFor={`show-archived-${book.id}`} className="text-sm cursor-pointer">
                            Show archived
                          </Label>
                        </div>
                      </div>
                    )}

                    {pages.length === 0 && !showArchived && archivedCount > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>All {archivedCount} pages are archived.</p>
                        <Button
                          variant="link"
                          onClick={() => setShowArchived(true)}
                          className="mt-2"
                        >
                          Show archived pages
                        </Button>
                      </div>
                    ) : pages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No pages yet. Add your first coloring page above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {pages.map((page) => (
                          <div
                            key={page.id}
                            className={`relative group rounded-lg border-2 overflow-hidden aspect-square ${
                              page.is_active === false 
                                ? "border-muted opacity-50" 
                                : "border-border"
                            }`}
                          >
                            {/* Archived badge */}
                            {page.is_active === false && (
                              <div className="absolute top-1 left-1 z-10">
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                  <Archive className="w-3 h-3 mr-1" />
                                  Archived
                                </Badge>
                              </div>
                            )}
                            {page.image_url ? (
                              <img
                                src={page.image_url}
                                alt={page.title}
                                className="w-full h-full object-cover cursor-pointer bg-white"
                                loading="lazy"
                                onClick={() => setPreviewImage({ url: page.image_url, name: page.title })}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageOff className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}

                            {/* Name overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                              <span className="text-xs text-white font-medium">{page.title}</span>
                            </div>

                            {/* Actions on hover */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                              {page.image_url && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setPreviewImage({ url: page.image_url, name: page.title })}
                                  className="text-xs h-7"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingPage(page);
                                  setEditPageName(page.title);
                                }}
                                className="text-xs h-7"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit Name
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRegeneratePage(page)}
                                disabled={regeneratingId === page.id}
                                className="text-xs h-7"
                              >
                                {regeneratingId === page.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regen
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant={page.is_active ? "secondary" : "default"}
                                onClick={() => handleTogglePageActive(page)}
                                className="text-xs h-7"
                              >
                                {page.is_active ? (
                                  <>
                                    <Archive className="w-3 h-3 mr-1" />
                                    Archive
                                  </>
                                ) : (
                                  <>
                                    <ArchiveRestore className="w-3 h-3 mr-1" />
                                    Restore
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      {/* Book Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? "Edit" : "Create New"} Coloring Book</DialogTitle>
            <DialogDescription>
              {editingBook ? "Update the book details below" : "Enter details for your new coloring book"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitBook} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={bookFormData.title}
                onChange={(e) => {
                  setBookFormData({ ...bookFormData, title: e.target.value });
                  if (!coverPrompt) setCoverPrompt(e.target.value);
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
                  disabled={generatingDescription || !bookFormData.title.trim()}
                  className="h-7 text-xs"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                value={bookFormData.description}
                onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                placeholder="What's this book about?"
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-2 bg-primary/5">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Theme (used when generating pages)
              </Label>
              <Textarea
                value={bookFormData.generation_prompt}
                onChange={(e) => setBookFormData({ ...bookFormData, generation_prompt: e.target.value })}
                placeholder="e.g., 'all characters are in a full outdoor nature scene with trees, flowers, and sky'"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This gets automatically combined with each page title/description when generating AI pages.
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
                  checked={bookFormData.is_free}
                  onCheckedChange={(checked) => setBookFormData({ ...bookFormData, is_free: checked })}
                />
              </div>
              {!bookFormData.is_free && (
                <div>
                  <Label>Price (coins)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={bookFormData.coin_price}
                    onChange={(e) => setBookFormData({ ...bookFormData, coin_price: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={bookFormData.display_order}
                onChange={(e) => setBookFormData({ ...bookFormData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* AI Cover Generation */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Generate Cover with AI
              </Label>
              <div className="flex gap-2">
                <Input
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                  placeholder="e.g., cute animals playing together"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateCover()}
                  disabled={generatingCover === "new" || !coverPrompt.trim()}
                  variant="secondary"
                >
                  {generatingCover === "new" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {generatedCoverUrl && (
                <div className="relative">
                  <img 
                    src={generatedCoverUrl} 
                    alt="Generated" 
                    className="w-full max-w-xs mx-auto rounded border"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">AI Generated Cover</p>
                </div>
              )}
            </div>

            {/* Current Cover Preview */}
            {editingBook?.cover_image_url && !bookImageFile && !generatedCoverUrl && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm text-muted-foreground mb-2 block">Current Cover</Label>
                <img 
                  src={editingBook.cover_image_url} 
                  alt="Current cover" 
                  className="w-full max-w-xs mx-auto rounded border"
                />
              </div>
            )}

            {/* Or Upload */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload</span>
              </div>
            </div>

            <div>
              <Label>Upload Cover Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setBookImageFile(e.target.files?.[0] || null);
                  if (e.target.files?.[0]) setGeneratedCoverUrl(null);
                }}
              />
              {bookImageFile && (
                <img 
                  src={URL.createObjectURL(bookImageFile)} 
                  alt="Preview" 
                  className="mt-2 w-32 h-40 object-cover rounded"
                />
              )}
            </div>

            <Button type="submit" disabled={saveBookMutation.isPending || bookUploading || generatingCover === "new"} className="w-full">
              {bookUploading ? "Uploading..." : saveBookMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Page Name Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => {
        if (!open) {
          setEditingPage(null);
          setEditPageName("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Page Name</DialogTitle>
            <DialogDescription>
              Update the name for this coloring page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Page Name</Label>
              <Input
                value={editPageName}
                onChange={(e) => setEditPageName(e.target.value)}
                placeholder="Enter page name..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPage(null);
                  setEditPageName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingPage) {
                    handleUpdatePageName(editingPage, editPageName);
                  }
                }}
                disabled={!editPageName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
