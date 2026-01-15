import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Eye, EyeOff, Sparkles, Loader2, CreditCard, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

interface CardDesign {
  id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  difficulty: string | null;
  is_active: boolean;
  card_templates?: { title: string } | null;
}

interface CardTemplate {
  id: string;
  title: string;
}

export function CardDesignsManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<CardDesign | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | "all">("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    template_id: "",
    display_order: 0,
    difficulty: "easy",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

  // Fetch templates for dropdown
  const { data: templates } = useQuery({
    queryKey: ["admin-card-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_templates")
        .select("id, title")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CardTemplate[];
    },
  });

  // Fetch designs
  const { data: designs, isLoading } = useQuery({
    queryKey: ["admin-card-designs", selectedTemplateId],
    queryFn: async () => {
      let query = supabase
        .from("card_designs")
        .select("*, card_templates(title)")
        .order("display_order", { ascending: true });
      
      if (selectedTemplateId !== "all") {
        query = query.eq("template_id", selectedTemplateId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CardDesign[];
    },
  });

  const generateImage = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("generate-coloring-page", {
      body: { 
        prompt: `Create a black and white LINE ART greeting card design for coloring. Simple clean outlines, no shading, no fills. Theme: ${prompt}. Style: greeting card format, decorative but colorable.`
      },
    });

    if (error) throw error;
    return data.imageUrl;
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a description for the design");
      return;
    }
    
    setGeneratingImage(true);
    try {
      const imageUrl = await generateImage(aiPrompt);
      setGeneratedImageUrl(imageUrl);
      setImageFile(null);
      toast.success("Design generated!");
    } catch (error) {
      showErrorToastWithCopy("Generating design", error);
    } finally {
      setGeneratingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let imageUrl = generatedImageUrl || editingDesign?.image_url;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`card-designs/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`card-designs/${fileName}`);
        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (!imageUrl) throw new Error("Design image is required");

      const payload = { 
        ...data, 
        image_url: imageUrl,
        template_id: data.template_id || null,
      };

      if (editingDesign) {
        const { error } = await supabase
          .from("card_designs")
          .update(payload)
          .eq("id", editingDesign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("card_designs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-designs"] });
      toast.success(editingDesign ? "Design updated!" : "Design created!");
      handleCloseDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving design", error);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_designs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-designs"] });
      toast.success("Design deleted!");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("card_designs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-card-designs"] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDesign(null);
    setFormData({ title: "", description: "", template_id: "", display_order: 0, difficulty: "easy" });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setAiPrompt("");
  };

  const handleEdit = (design: CardDesign) => {
    setEditingDesign(design);
    setFormData({
      title: design.title,
      description: design.description || "",
      template_id: design.template_id || "",
      display_order: design.display_order || 0,
      difficulty: design.difficulty || "easy",
    });
    setAiPrompt(design.title);
    setImageFile(null);
    setGeneratedImageUrl(null);
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
          <CreditCard className="w-5 h-5" />
          Card Designs
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Design
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDesign ? "Edit" : "Add"} Card Design</DialogTitle>
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
                    placeholder="e.g., Birthday Balloons"
                    required
                  />
                </div>

                <div>
                  <Label>Template (Optional)</Label>
                  <Select 
                    value={formData.template_id} 
                    onValueChange={(v) => setFormData({ ...formData, template_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Template</SelectItem>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Difficulty</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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

                {/* AI Image Generation */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Generate Design with AI
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., birthday cake with candles"
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
                        className="w-full max-w-xs mx-auto rounded border bg-white"
                      />
                      <p className="text-xs text-center text-muted-foreground mt-1">Generated design</p>
                    </div>
                  )}
                </div>

                {/* Upload Image */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Or Upload Image
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] || null);
                      setGeneratedImageUrl(null);
                    }}
                    className="mt-1"
                  />
                  {imageFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>

                {/* Current image preview */}
                {editingDesign?.image_url && !generatedImageUrl && !imageFile && (
                  <div>
                    <Label>Current Image</Label>
                    <img 
                      src={editingDesign.image_url} 
                      alt="Current" 
                      className="w-full max-w-xs mx-auto rounded border bg-white mt-1"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={saveMutation.isPending || uploading}
                  >
                    {(saveMutation.isPending || uploading) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingDesign ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading designs...</div>
        ) : !designs?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No card designs yet. Click "Add Design" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {designs.map((design) => (
              <Card key={design.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={design.image_url}
                      alt={design.title}
                      className={`w-full aspect-[5/7] object-cover bg-white ${!design.is_active ? "opacity-50" : ""}`}
                    />
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-medium text-sm truncate">{design.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{design.difficulty}</p>
                    {design.card_templates?.title && (
                      <p className="text-xs text-primary truncate">{design.card_templates.title}</p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(design)}
                        title="Edit design"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate({ id: design.id, is_active: !design.is_active })}
                        title={design.is_active ? "Hide design" : "Show design"}
                      >
                        {design.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Delete this design?")) {
                            deleteMutation.mutate(design.id);
                          }
                        }}
                        title="Delete design"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
