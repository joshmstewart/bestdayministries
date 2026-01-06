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
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

export function ColoringPagesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    difficulty: "easy",
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-coloring-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const generateImage = async (prompt: string): Promise<string> => {
    const fullPrompt = `Black and white line art coloring page for children. Simple clean outlines, no shading, no filled areas, white background. Subject: ${prompt}. Style: Simple cartoon line drawing suitable for coloring, thick black outlines on pure white background.`;
    
    const { data, error } = await supabase.functions.invoke("generate-coloring-page", {
      body: { prompt: fullPrompt },
    });
    
    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a description for the image");
      return;
    }
    
    setGeneratingImage(true);
    try {
      const imageUrl = await generateImage(aiPrompt);
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
    const prompt = page.description || page.title;
    setRegeneratingId(page.id);
    
    try {
      const imageUrl = await generateImage(prompt);
      
      // Update the page with new image
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
        const fileName = `${Date.now()}-${imageFile.name}`;
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

      const payload = { ...data, image_url: imageUrl };

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
    setFormData({ title: "", description: "", category: "general", difficulty: "easy", display_order: 0 });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setAiPrompt("");
  };

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      description: page.description || "",
      category: page.category || "general",
      difficulty: page.difficulty || "easy",
      display_order: page.display_order || 0,
    });
    setAiPrompt(page.description || page.title);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Coloring Pages</CardTitle>
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
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
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
                  accept="image/*"
                  onChange={(e) => {
                    setImageFile(e.target.files?.[0] || null);
                    if (e.target.files?.[0]) setGeneratedImageUrl(null);
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
        ) : !pages?.length ? (
          <p className="text-muted-foreground">No coloring pages yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pages.map((page) => (
              <div key={page.id} className="relative group border rounded-lg overflow-hidden">
                <img src={page.image_url} alt={page.title} className="w-full aspect-square object-cover bg-white" />
                <div className="p-2">
                  <p className="font-medium text-sm truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{page.difficulty}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => toggleActiveMutation.mutate({ id: page.id, is_active: !page.is_active })}
                    title={page.is_active ? "Hide" : "Show"}
                  >
                    {page.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-600" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8" 
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
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEdit(page)} title="Edit">
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