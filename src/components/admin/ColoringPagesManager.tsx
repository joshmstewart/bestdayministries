import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Loader2, RefreshCw, BookOpen, FileUp } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

export function ColoringPagesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    difficulty: "easy",
    display_order: 0,
    book_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [fullPrompt, setFullPrompt] = useState("");
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // Default template for coloring page prompts
  const DEFAULT_PROMPT_TEMPLATE = "Black and white line art coloring page for children. Simple clean outlines, no shading, no filled areas, white background. Subject: {SUBJECT}. Style: Simple cartoon line drawing suitable for coloring, thick black outlines on pure white background.";

  // Build the full prompt from subject and template
  const buildFullPrompt = (subject: string, bookTheme?: string) => {
    let subjectDescription = subject;
    if (bookTheme) {
      subjectDescription = `${subject}. Theme/context: ${bookTheme}`;
    }
    return DEFAULT_PROMPT_TEMPLATE.replace("{SUBJECT}", subjectDescription);
  };

  // Update full prompt when aiPrompt or book changes
  const updateFullPrompt = (subject: string, bookId?: string) => {
    const selectedBook = books?.find(b => b.id === bookId);
    const bookTheme = selectedBook?.generation_prompt;
    setFullPrompt(buildFullPrompt(subject, bookTheme));
  };
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);

  const { data: books } = useQuery({
    queryKey: ["admin-coloring-books-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select("id, title, generation_prompt")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-coloring-pages", selectedBookId],
    queryFn: async () => {
      let query = supabase
        .from("coloring_pages")
        .select("*, coloring_books(title)")
        .order("display_order", { ascending: true });
      
      if (selectedBookId !== "all") {
        query = query.eq("book_id", selectedBookId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const generateImage = async (subject: string, bookTheme?: string): Promise<string> => {
    console.log("Calling generate-coloring-page with:", { prompt: subject, bookTheme });
    const { data, error } = await supabase.functions.invoke("generate-coloring-page", {
      body: { prompt: subject, bookTheme: bookTheme || "" },
    });
    
    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a description for the image");
      return;
    }
    
    const selectedBook = books?.find(b => b.id === formData.book_id);
    const bookTheme = selectedBook?.generation_prompt;
    
    if (!bookTheme) {
      toast.warning("This book has no generation theme/prompt set - using generic style");
    }
    
    setGeneratingImage(true);
    try {
      // Pass subject and theme SEPARATELY - let backend enforce the theme
      const imageUrl = await generateImage(aiPrompt.trim(), bookTheme);
      setGeneratedImageUrl(imageUrl);
      setImageFile(null);
      toast.success("Image generated!");
    } catch (error) {
      toast.error("Failed to generate image: " + (error as Error).message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleRegenerateImage = async (page: any) => {
    const subject = page.description || page.title;
    setRegeneratingId(page.id);
    
    try {
      // Pass subject and theme SEPARATELY - let backend enforce the theme
      const selectedBook = books?.find(b => b.id === page.book_id);
      const bookTheme = selectedBook?.generation_prompt;
      
      const imageUrl = await generateImage(subject, bookTheme);
      
      const { error } = await supabase
        .from("coloring_pages")
        .update({ image_url: imageUrl })
        .eq("id", page.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      toast.success("Image regenerated!");
    } catch (error) {
      toast.error("Failed to regenerate: " + (error as Error).message);
    } finally {
      setRegeneratingId(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = editingPage?.image_url || generatedImageUrl;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const sanitizedName = imageFile.name.replace(/\s+/g, '_');
        const fileName = `${Date.now()}-${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`coloring-pages/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`coloring-pages/${fileName}`);
        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (!imageUrl) throw new Error("Image is required");

      const payload = { 
        ...data, 
        image_url: imageUrl,
        book_id: data.book_id || null,
      };

      if (editingPage) {
        const { error } = await supabase
          .from("coloring_pages")
          .update(payload)
          .eq("id", editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coloring_pages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success(editingPage ? "Page updated!" : "Page created!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Failed to save: " + (error as Error).message);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coloring_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-books"] });
      toast.success("Page deleted!");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coloring_pages")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPage(null);
    setFormData({ title: "", description: "", category: "general", difficulty: "easy", display_order: 0, book_id: "" });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setAiPrompt("");
    setFullPrompt("");
    setShowFullPrompt(false);
    setPdfFile(null);
    setPdfPages([]);
  };

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setProcessingPdf(true);
    setPdfPages([]);
    
    try {
      // Upload PDF to storage temporarily
      const fileName = `temp-pdf/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(fileName);
      
      // Call edge function to extract pages as images
      const { data, error } = await supabase.functions.invoke("extract-pdf-pages", {
        body: { pdfUrl: urlData.publicUrl },
      });
      
      if (error) throw error;
      
      setPdfPages(data.pages || []);
      toast.success(`Extracted ${data.pages?.length || 0} pages from PDF`);
      
      // Clean up temp PDF
      await supabase.storage.from("app-assets").remove([fileName]);
    } catch (error) {
      console.error("PDF processing error:", error);
      toast.error("Failed to process PDF: " + (error as Error).message);
    } finally {
      setProcessingPdf(false);
    }
  };

  const handleAddPdfPage = async (pageUrl: string, pageNum: number) => {
    const baseTitle = pdfFile?.name.replace(/\.pdf$/i, "") || "PDF Page";
    const title = `${baseTitle} - Page ${pageNum}`;
    
    try {
      const { error } = await supabase.from("coloring_pages").insert({
        title,
        description: `Page ${pageNum} from ${pdfFile?.name || "PDF"}`,
        image_url: pageUrl,
        category: "general",
        difficulty: formData.difficulty,
        display_order: (pages?.length || 0) + pageNum,
        book_id: formData.book_id || null,
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      toast.success(`Added page ${pageNum}`);
    } catch (error) {
      toast.error("Failed to add page: " + (error as Error).message);
    }
  };

  const handleAddAllPdfPages = async () => {
    if (!pdfPages.length) return;
    
    setUploading(true);
    const baseTitle = pdfFile?.name.replace(/\.pdf$/i, "") || "PDF Page";
    
    try {
      const pagesToInsert = pdfPages.map((pageUrl, idx) => ({
        title: `${baseTitle} - Page ${idx + 1}`,
        description: `Page ${idx + 1} from ${pdfFile?.name || "PDF"}`,
        image_url: pageUrl,
        category: "general",
        difficulty: formData.difficulty,
        display_order: (pages?.length || 0) + idx + 1,
        book_id: formData.book_id || null,
      }));
      
      const { error } = await supabase.from("coloring_pages").insert(pagesToInsert);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      toast.success(`Added all ${pdfPages.length} pages!`);
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to add pages: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      description: page.description || "",
      category: page.category || "general",
      difficulty: page.difficulty || "easy",
      display_order: page.display_order || 0,
      book_id: page.book_id || "",
    });
    const subject = page.description || page.title;
    setAiPrompt(subject);
    // Initialize the full prompt
    const selectedBook = books?.find(b => b.id === page.book_id);
    const bookTheme = selectedBook?.generation_prompt;
    setFullPrompt(buildFullPrompt(subject, bookTheme));
    setShowFullPrompt(false);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle>Coloring Pages</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={selectedBookId} onValueChange={setSelectedBookId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by book" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Books</SelectItem>
              {books?.map((book) => (
                <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPage ? "Edit" : "Add"} Coloring Page</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Cute Puppy"
                    required
                  />
                </div>
                <div>
                  <Label>Description (used for AI generation)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      setAiPrompt(e.target.value);
                    }}
                    placeholder="Describe what the coloring page should show..."
                    rows={2}
                  />
                </div>

                {/* Book Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Assign to Book
                  </Label>
                  <Select
                    value={formData.book_id}
                    onValueChange={(v) => setFormData({ ...formData, book_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a book..." /></SelectTrigger>
                    <SelectContent>
                      {books?.map((book) => (
                        <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* AI Image Generation */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Generate with AI
                  </Label>
                  
                  {/* Show selected book's theme if available */}
                  {formData.book_id && books?.find(b => b.id === formData.book_id)?.generation_prompt && (
                    <div className="bg-primary/10 rounded-md p-2 text-sm">
                      <span className="font-medium">Book theme: </span>
                      <span className="text-muted-foreground">
                        {books?.find(b => b.id === formData.book_id)?.generation_prompt}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm">Subject Description</Label>
                    <div className="flex gap-2">
                      <Input
                        value={aiPrompt}
                        onChange={(e) => {
                          setAiPrompt(e.target.value);
                          // Auto-update full prompt when subject changes (if not in custom mode)
                          if (!showFullPrompt) {
                            updateFullPrompt(e.target.value, formData.book_id);
                          }
                        }}
                        placeholder="e.g., a friendly dragon flying over mountains"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={generatingImage || !aiPrompt.trim()}
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
                  
                  {/* Toggle to show/edit full prompt */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (!showFullPrompt) {
                          // Initialize full prompt when opening
                          updateFullPrompt(aiPrompt, formData.book_id);
                        }
                        setShowFullPrompt(!showFullPrompt);
                      }}
                    >
                      {showFullPrompt ? "▼ Hide Full Prompt" : "► Show Full Prompt (Advanced)"}
                    </Button>
                    
                    {showFullPrompt && (
                      <div className="space-y-2">
                        <Textarea
                          value={fullPrompt}
                          onChange={(e) => setFullPrompt(e.target.value)}
                          placeholder="Full prompt for image generation..."
                          rows={5}
                          className="text-xs font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Edit the full prompt above. Use {"{SUBJECT}"} as placeholder for subject description.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateFullPrompt(aiPrompt, formData.book_id)}
                        >
                          Reset to Default Template
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {generatedImageUrl && (
                    <div className="relative">
                      <img 
                        src={generatedImageUrl} 
                        alt="Generated" 
                        className="w-full max-w-xs mx-auto rounded border"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-1">AI Generated</p>
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

                <div>
                  <Label>Upload Line Art Image</Label>
                <Input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type === 'application/pdf') {
                          // If PDF, trigger the PDF upload handler instead
                          handlePdfUpload(file);
                          e.target.value = ''; // Reset so they can select again
                        } else {
                          setImageFile(file);
                          setGeneratedImageUrl(null);
                        }
                      }
                    }}
                  />
                  {editingPage?.image_url && !imageFile && !generatedImageUrl && (
                    <img src={editingPage.image_url} alt="Current" className="mt-2 w-32 h-32 object-cover rounded" />
                  )}
                  {imageFile && (
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Preview" 
                      className="mt-2 w-32 h-32 object-cover rounded"
                    />
                  )}
                </div>

                {/* PDF Upload Section */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or upload PDF</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <Label className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-primary" />
                    Upload PDF (extracts each page as a coloring page)
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePdfUpload(file);
                    }}
                    disabled={processingPdf}
                  />
                  {processingPdf && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing PDF pages...
                    </div>
                  )}
                  {pdfPages.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Found {pdfPages.length} pages. Click to add individually or add all:
                      </p>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {pdfPages.map((pageUrl, idx) => (
                          <div 
                            key={idx} 
                            className="relative group cursor-pointer border rounded overflow-hidden"
                            onClick={() => handleAddPdfPage(pageUrl, idx + 1)}
                          >
                            <img src={pageUrl} alt={`Page ${idx + 1}`} className="w-full aspect-square object-cover bg-white" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Plus className="w-6 h-6 text-white" />
                            </div>
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                              {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddAllPdfPages}
                        disabled={uploading}
                        className="w-full"
                        variant="secondary"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add All {pdfPages.length} Pages
                      </Button>
                    </div>
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
        ) : !pages?.length ? (
          <p className="text-muted-foreground">No coloring pages yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pages.map((page: any) => (
              <div key={page.id} className="relative group border rounded-lg overflow-hidden">
                <img src={page.image_url} alt={page.title} className="w-full aspect-square object-cover bg-white" />
                <div className="p-2">
                  <p className="font-medium text-sm truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{page.difficulty}</p>
                  {page.coloring_books?.title && (
                    <p className="text-xs text-primary truncate">{page.coloring_books.title}</p>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-background/80"
                    onClick={() => toggleActiveMutation.mutate({ id: page.id, is_active: !page.is_active })}
                    title={page.is_active ? "Hide" : "Show"}
                  >
                    {page.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-600" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 bg-background/80" 
                    onClick={() => handleRegenerateImage(page)}
                    disabled={regeneratingId === page.id}
                    title="Regenerate image with AI"
                  >
                    {regeneratingId === page.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 bg-background/80" onClick={() => handleEdit(page)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => deleteMutation.mutate(page.id)}
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