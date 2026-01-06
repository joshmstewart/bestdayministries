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
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Loader2, Coins, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

export function ColoringBooksManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coin_price: 0,
    is_free: true,
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const { data: books, isLoading } = useQuery({
    queryKey: ["admin-coloring-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_books")
        .select("*, coloring_pages(count)")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const generateCover = async (prompt: string): Promise<string> => {
    const fullPrompt = `Book cover illustration for a children's coloring book titled "${prompt}". Colorful, whimsical, inviting design that makes children want to open the book. Include decorative border elements.`;
    
    const { data, error } = await supabase.functions.invoke("generate-coloring-page", {
      body: { prompt: fullPrompt },
    });
    
    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateCover = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a description for the cover");
      return;
    }
    
    setGeneratingImage(true);
    try {
      const imageUrl = await generateCover(aiPrompt);
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
      let coverUrl = editingBook?.cover_image_url || generatedImageUrl;

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
    setFormData({ title: "", description: "", coin_price: 0, is_free: true, display_order: 0 });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setAiPrompt("");
  };

  const handleEdit = (book: any) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      description: book.description || "",
      coin_price: book.coin_price || 0,
      is_free: book.is_free,
      display_order: book.display_order || 0,
    });
    setAiPrompt(book.title);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Coloring Books
        </CardTitle>
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
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this book about?"
                  rows={2}
                />
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
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., cute animals playing together"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateCover}
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
                {editingBook?.cover_image_url && !imageFile && !generatedImageUrl && (
                  <img src={editingBook.cover_image_url} alt="Current" className="mt-2 w-32 h-40 object-cover rounded" />
                )}
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
                    {book.coloring_pages?.[0]?.count || 0} pages
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