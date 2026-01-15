import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Eye, EyeOff, Trash2, Loader2, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";
import { useAuth } from "@/contexts/AuthContext";

interface CardWordArt {
  id: string;
  template_id: string | null;
  title: string;
  phrase: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface CardTemplate {
  id: string;
  title: string;
}

export function CardWordArtManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWordArt, setEditingWordArt] = useState<CardWordArt | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    phrase: "",
    template_id: "all" as string,
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Fetch word arts
  const { data: wordArts, isLoading } = useQuery({
    queryKey: ["admin-card-word-arts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_word_arts")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CardWordArt[];
    },
  });

  // Fetch templates for dropdown
  const { data: templates } = useQuery({
    queryKey: ["card-templates-for-wordart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_templates")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data as CardTemplate[];
    },
  });

  // Generate word art image using AI
  const handleGenerateWordArt = async () => {
    if (!formData.phrase.trim()) {
      toast.error("Please enter a phrase first");
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Create a decorative word art image with the text "${formData.phrase}" in fun, bold, block letters. The letters should be outlined (not filled) so they can be colored in. Style: greeting card word art, playful typography, black outlines on white background, thick block letters with decorative elements. The text should be the main focus and fill most of the image. Portrait orientation (taller than wide).`;

      const { data, error } = await supabase.functions.invoke("generate-card-design", {
        body: { prompt, phrase: formData.phrase },
      });

      if (error) throw error;
      
      setGeneratedImageUrl(data.imageUrl);
      setImageFile(null);
      toast.success("Word art generated!");
    } catch (error) {
      showErrorToastWithCopy("Generating word art", error);
    } finally {
      setGenerating(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let imageUrl = generatedImageUrl || editingWordArt?.image_url;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const fileName = `word-art-${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`card-word-arts/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`card-word-arts/${fileName}`);
        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (!imageUrl) throw new Error("Image is required");

      const payload = {
        title: data.title,
        phrase: data.phrase,
        template_id: data.template_id === "all" ? null : data.template_id,
        display_order: data.display_order,
        image_url: imageUrl,
        created_by: user?.id,
      };

      if (editingWordArt) {
        const { error } = await supabase
          .from("card_word_arts")
          .update(payload)
          .eq("id", editingWordArt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("card_word_arts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-word-arts"] });
      toast.success(editingWordArt ? "Word art updated!" : "Word art created!");
      handleCloseDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving word art", error);
      setUploading(false);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("card_word_arts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-word-arts"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_word_arts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-word-arts"] });
      toast.success("Word art deleted!");
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWordArt(null);
    setFormData({ title: "", phrase: "", template_id: "all", display_order: 0 });
    setImageFile(null);
    setGeneratedImageUrl(null);
  };

  const handleEdit = (wordArt: CardWordArt) => {
    setEditingWordArt(wordArt);
    setFormData({
      title: wordArt.title,
      phrase: wordArt.phrase,
      template_id: wordArt.template_id || "all",
      display_order: wordArt.display_order,
    });
    setGeneratedImageUrl(null);
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getTemplateName = (templateId: string | null) => {
    if (!templateId) return "All Packs";
    return templates?.find(t => t.id === templateId)?.title || "Unknown";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Word Arts
          </CardTitle>
          <CardDescription>
            Pre-generated phrases users can add to their cards
          </CardDescription>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Word Art
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !wordArts?.length ? (
          <p className="text-muted-foreground">No word arts yet. Create your first word art above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wordArts.map((wordArt) => (
              <div
                key={wordArt.id}
                className={`relative group rounded-lg border overflow-hidden ${
                  !wordArt.is_active ? "opacity-50" : ""
                }`}
              >
                <div 
                  className="aspect-[3/2] bg-white cursor-pointer"
                  onClick={() => setPreviewImage({ url: wordArt.image_url, name: wordArt.phrase })}
                >
                  <img
                    src={wordArt.image_url}
                    alt={wordArt.phrase}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="p-2 bg-muted/50">
                  <p className="text-sm font-medium truncate">{wordArt.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{wordArt.phrase}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getTemplateName(wordArt.template_id)}
                  </Badge>
                </div>
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" onClick={() => handleEdit(wordArt)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => toggleActiveMutation.mutate({ id: wordArt.id, is_active: !wordArt.is_active })}
                  >
                    {wordArt.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Delete this word art?")) {
                        deleteMutation.mutate(wordArt.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingWordArt ? "Edit Word Art" : "Add Word Art"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title (internal name)</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Birthday Greeting"
                  required
                />
              </div>

              <div>
                <Label>Phrase (text in image)</Label>
                <Input
                  value={formData.phrase}
                  onChange={(e) => setFormData({ ...formData, phrase: e.target.value })}
                  placeholder="e.g., Happy Birthday!"
                  required
                />
              </div>

              <div>
                <Label>Card Pack (optional)</Label>
                <Select
                  value={formData.template_id}
                  onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packs</SelectItem>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
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

              {/* Image section */}
              <div className="space-y-2">
                <Label>Word Art Image</Label>
                
                {/* Preview current/generated image */}
                {(generatedImageUrl || editingWordArt?.image_url) && !imageFile && (
                  <div className="rounded-lg border bg-white p-2 mb-2">
                    <img
                      src={generatedImageUrl || editingWordArt?.image_url}
                      alt="Word art preview"
                      className="w-full h-32 object-contain"
                    />
                  </div>
                )}

                {/* Generate button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateWordArt}
                  disabled={generating || !formData.phrase.trim()}
                  className="w-full gap-2"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Generate from Phrase
                </Button>

                <p className="text-xs text-center text-muted-foreground">or</p>

                {/* Upload button */}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setGeneratedImageUrl(null);
                    }
                  }}
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending || uploading || (!generatedImageUrl && !imageFile && !editingWordArt?.image_url)}
                >
                  {(saveMutation.isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingWordArt ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{previewImage?.name}</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="flex justify-center bg-white rounded-lg p-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
