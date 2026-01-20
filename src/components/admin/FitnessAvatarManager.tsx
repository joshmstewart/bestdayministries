import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, Coins, Eye, EyeOff, Wand2, Shuffle, RefreshCw, Dumbbell, Download, Upload, Eraser, Archive, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import ImageLightbox from "@/components/ImageLightbox";

interface AvatarTemplate {
  id: string;
  name: string;
  character_type: string;
  prompt: string;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

const defaultFormData = {
  name: "", description: "", preview_image_url: "", character_prompt: "",
  is_free: false, price_coins: 100, display_order: 0, is_active: true,
  character_type: "human" as string, // Track character type for image generation
};

export function FitnessAvatarManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatingInDialog, setGeneratingInDialog] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [generatingWorkoutTest, setGeneratingWorkoutTest] = useState<string | null>(null);
  const [workoutTestResult, setWorkoutTestResult] = useState<{
    imageUrl: string;
    workout: string;
    location: string;
  } | null>(null);
  const [workoutTestDialogOpen, setWorkoutTestDialogOpen] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [removingBgFor, setRemovingBgFor] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setLightboxOpen(true);
  };

  const handleDownloadImage = async (avatar: any) => {
    if (!avatar.preview_image_url) {
      toast.error("No image to download");
      return;
    }
    
    try {
      const response = await fetch(avatar.preview_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${avatar.name.toLowerCase().replace(/\s+/g, "-")}-avatar.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const handleUploadImage = async (avatarId: string, file: File) => {
    setUploadingFor(avatarId);
    
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `fitness-avatar-${avatarId}-${Date.now()}.${fileExt}`;
      const filePath = `fitness-avatars/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from("fitness_avatars")
        .update({ preview_image_url: urlData.publicUrl })
        .eq("id", avatarId);
      
      if (updateError) throw updateError;
      
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      showErrorToastWithCopy("Failed to upload image", error);
    } finally {
      setUploadingFor(null);
    }
  };

  const handleRemoveBackground = async (avatar: any) => {
    if (!avatar.preview_image_url) {
      toast.error("No image to process");
      return;
    }
    
    setRemovingBgFor(avatar.id);
    toast.info("🎨 Removing background...", { description: "This may take a moment." });
    
    try {
      const { data, error } = await supabase.functions.invoke("remove-customer-background", {
        body: { imageUrl: avatar.preview_image_url, customerId: avatar.id },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Update the avatar with the new image
      const { error: updateError } = await supabase
        .from("fitness_avatars")
        .update({ preview_image_url: data.imageUrl })
        .eq("id", avatar.id);
      
      if (updateError) throw updateError;
      
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Background removed!", { description: "Image updated with white background." });
    } catch (error) {
      console.error("Background removal error:", error);
      showErrorToastWithCopy("Failed to remove background", error);
    } finally {
      setRemovingBgFor(null);
    }
  };

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-fitness-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fitness_avatars").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch avatar templates from database
  const { data: avatarTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["avatar-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatar_templates")
        .select("*")
        .order("character_type")
        .order("name");
      if (error) throw error;
      return data as AvatarTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        name: data.name, description: data.description || null,
        preview_image_url: data.preview_image_url || null, character_prompt: data.character_prompt,
        is_free: data.is_free, price_coins: data.is_free ? 0 : data.price_coins,
        display_order: data.display_order, is_active: data.is_active,
      };
      if (data.id) {
        const { error } = await supabase.from("fitness_avatars").update(payload).eq("id", data.id);
        if (error) throw error;
        return { id: data.id };
      } else {
        const { data: newAvatar, error } = await supabase.from("fitness_avatars").insert(payload).select().single();
        if (error) throw error;
        return { id: newAvatar.id, isNew: true };
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success(editingAvatar ? "Avatar updated!" : "Avatar created!");
      handleCloseDialog();
    },
    onError: (error) => showErrorToastWithCopy("Failed to save avatar", error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_avatars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }); toast.success("Avatar deleted"); },
    onError: (error) => showErrorToastWithCopy("Failed to delete avatar", error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("fitness_avatars").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }),
  });

  const generateImageMutation = useMutation({
    mutationFn: async (avatar: { id: string; name: string; character_prompt: string; character_type?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-avatar-image", {
        body: { 
          avatarId: avatar.id, 
          characterPrompt: avatar.character_prompt, 
          name: avatar.name,
          characterType: avatar.character_type || 'human' // Default to human if not specified
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Avatar image generated!", { description: "The preview has been updated." });
      // Update form data with new image URL if in dialog
      if (data.imageUrl) {
        setFormData(prev => ({ ...prev, preview_image_url: data.imageUrl }));
      }
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to generate image", error);
    },
    onSettled: () => {
      setGeneratingImageFor(null);
      setGeneratingInDialog(false);
    },
  });

  const testWorkoutImageMutation = useMutation({
    mutationFn: async (avatar: { id: string; name: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-workout-image", {
        body: { 
          avatarId: avatar.id, 
          imageType: "activity",
          isAdminTest: true,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setWorkoutTestResult({
        imageUrl: data.image?.image_url,
        workout: data.selectedWorkout || "Unknown",
        location: data.selectedLocation || "Unknown",
      });
      setWorkoutTestDialogOpen(true);
      toast.success("Test workout image generated!");
    },
    onError: (error) => {
      showErrorToastWithCopy("Failed to generate test workout image", error);
    },
    onSettled: () => {
      setGeneratingWorkoutTest(null);
    },
  });

  // Archive/unarchive template mutation
  const toggleArchiveMutation = useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) => {
      const { error } = await supabase
        .from("fitness_avatar_templates")
        .update({ 
          is_archived, 
          archived_at: is_archived ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["avatar-templates"] });
      toast.success(variables.is_archived ? "Template archived" : "Template restored");
    },
    onError: (error) => showErrorToastWithCopy("Failed to update template", error),
  });

  const handleTestWorkoutImage = (avatar: any) => {
    if (!avatar.character_prompt) {
      toast.error("Character prompt is required");
      return;
    }
    setGeneratingWorkoutTest(avatar.id);
    toast.info("🏋️ Generating test workout image...", { description: "Random workout + random location" });
    testWorkoutImageMutation.mutate({ id: avatar.id, name: avatar.name });
  };

  const handleEdit = (avatar: any) => {
    setEditingAvatar(avatar);
    setFormData({ 
      name: avatar.name, 
      description: avatar.description || "", 
      preview_image_url: avatar.preview_image_url || "",
      character_prompt: avatar.character_prompt || "", 
      is_free: avatar.is_free, 
      price_coins: avatar.price_coins,
      display_order: avatar.display_order, 
      is_active: avatar.is_active,
      character_type: "human", // Default for existing avatars
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { 
    setDialogOpen(false); 
    setEditingAvatar(null); 
    setFormData(defaultFormData); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.character_prompt) { 
      toast.error("Name and character prompt are required"); 
      return; 
    }
    
    const result = await saveMutation.mutateAsync({ ...formData, id: editingAvatar?.id });
    
    // If it's a new avatar and we have a character prompt but no image, auto-generate
    if (result.isNew && !formData.preview_image_url && formData.character_prompt) {
      toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
      generateImageMutation.mutate({ 
        id: result.id, 
        name: formData.name, 
        character_prompt: formData.character_prompt,
        character_type: formData.character_type,
      });
    }
  };

  const handleRandomize = () => {
    // Get active (non-archived) templates from database
    const activeTemplates = avatarTemplates?.filter(t => !t.is_archived) || [];
    
    if (activeTemplates.length === 0) {
      toast.error("No available templates. Add or unarchive some templates first.");
      return;
    }
    
    // Filter out templates already used as avatars
    const usedNames = new Set(avatars?.map(a => a.name.toLowerCase()) || []);
    const availableTemplates = activeTemplates.filter(t => !usedNames.has(t.name.toLowerCase()));
    const pool = availableTemplates.length > 0 ? availableTemplates : activeTemplates;
    
    const randomTemplate = pool[Math.floor(Math.random() * pool.length)];
    
    const typeEmoji = randomTemplate.character_type === 'animal' ? '🐾 Animal' 
      : randomTemplate.character_type === 'superhero' ? '🦸 Superhero' 
      : '👤 Human';
    
    setFormData(prev => ({
      ...prev,
      name: randomTemplate.name,
      description: `A ${randomTemplate.character_type === 'animal' ? 'friendly animal' : randomTemplate.character_type === 'superhero' ? 'heroic' : 'friendly'} character who loves fitness and can do any sport!`,
      character_prompt: randomTemplate.prompt,
      character_type: randomTemplate.character_type, // Track the type for image generation
      display_order: avatars?.length || 0,
    }));
    
    toast.success(`Randomized: ${randomTemplate.name}`, { 
      description: typeEmoji
    });
  };

  const handleGenerateImage = (avatar: any) => {
    if (!avatar.character_prompt) {
      toast.error("Character prompt is required to generate an image");
      return;
    }
    setGeneratingImageFor(avatar.id);
    toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
    // Try to infer character type from the prompt
    const inferredType = avatar.character_prompt?.toLowerCase().includes('animal') || 
                         avatar.character_prompt?.toLowerCase().match(/\b(dog|cat|bear|rabbit|fox|lion|tiger|panda|koala|owl|penguin|dolphin|elephant|giraffe|monkey)\b/)
                         ? 'animal' : 'human';
    generateImageMutation.mutate({ id: avatar.id, name: avatar.name, character_prompt: avatar.character_prompt, character_type: inferredType });
  };

  const handleGenerateImageInDialog = async () => {
    if (!formData.character_prompt) {
      toast.error("Character prompt is required to generate an image");
      return;
    }
    
    if (!editingAvatar?.id) {
      // Need to save first
      toast.error("Please save the avatar first, then generate an image");
      return;
    }
    
    setGeneratingInDialog(true);
    toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
    generateImageMutation.mutate({ 
      id: editingAvatar.id, 
      name: formData.name, 
      character_prompt: formData.character_prompt,
      character_type: formData.character_type,
    });
  };

  const handleSaveAndGenerate = async () => {
    if (!formData.name || !formData.character_prompt) {
      toast.error("Name and character prompt are required");
      return;
    }
    
    setGeneratingInDialog(true);
    
    try {
      // Save the avatar first
      const payload = {
        name: formData.name,
        description: formData.description || null,
        preview_image_url: formData.preview_image_url || null,
        character_prompt: formData.character_prompt,
        is_free: formData.is_free,
        price_coins: formData.is_free ? 0 : formData.price_coins,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };
      
      const { data: newAvatar, error } = await supabase
        .from("fitness_avatars")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      // Set as editing so subsequent generates work
      setEditingAvatar(newAvatar);
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success("Avatar created! Now generating image...");
      
      // Now generate the image
      generateImageMutation.mutate({
        id: newAvatar.id,
        name: formData.name,
        character_prompt: formData.character_prompt,
        character_type: formData.character_type,
      });
    } catch (error) {
      setGeneratingInDialog(false);
      showErrorToastWithCopy("Failed to save avatar", error);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const activeTemplatesCount = avatarTemplates?.filter(t => !t.is_archived).length || 0;
  const archivedTemplatesCount = avatarTemplates?.filter(t => t.is_archived).length || 0;

  return (
    <Tabs defaultValue="avatars" className="space-y-4">
      <TabsList>
        <TabsTrigger value="avatars">Avatars ({avatars?.length || 0})</TabsTrigger>
        <TabsTrigger value="templates">
          <Sparkles className="w-3 h-3 mr-1" />
          Idea Templates ({activeTemplatesCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="avatars">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fitness Avatars</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Mix of animal, human, and superhero characters for workouts</p>
              </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingAvatar(null); setFormData(defaultFormData); }}>
                <Plus className="h-4 w-4 mr-1" />Add Avatar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAvatar ? "Edit Avatar" : "Create Avatar"}</DialogTitle>
              </DialogHeader>
              
              {/* Randomize Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleRandomize}
                className="w-full"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Randomize Character (Fill All Details)
              </Button>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="Sporty Cat" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="A friendly cat who loves all sports" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Character Prompt *</Label>
                  <Textarea 
                    value={formData.character_prompt} 
                    onChange={(e) => setFormData({ ...formData, character_prompt: e.target.value })} 
                    rows={3} 
                    placeholder="A friendly orange tabby cat with athletic build, wearing a colorful headband..."
                  />
                  <p className="text-xs text-muted-foreground">Describe the character's appearance for AI generation. Don't include sports - they can do any sport!</p>
                </div>
                
                {/* Preview Image Section */}
                <div className="space-y-2">
                  <Label>Preview Image</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.preview_image_url} 
                      onChange={(e) => setFormData({ ...formData, preview_image_url: e.target.value })} 
                      placeholder="Auto-generated or paste URL"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={editingAvatar?.id ? handleGenerateImageInDialog : handleSaveAndGenerate}
                      disabled={generatingInDialog || !formData.character_prompt || !formData.name}
                      title={editingAvatar?.id ? "Generate AI image" : "Save & Generate AI image"}
                    >
                      {generatingInDialog ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                  </div>
                  {formData.preview_image_url && (
                    <div className="mt-2 flex items-center gap-3">
                      <img 
                        src={formData.preview_image_url} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(formData.preview_image_url)}
                        title="Click to enlarge"
                      />
                      <span className="text-xs text-muted-foreground">Click to enlarge</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {editingAvatar?.id ? "Click the wand to regenerate" : "Click the wand to save & generate image"}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input 
                      type="number" 
                      value={formData.display_order} 
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coin Price</Label>
                    <Input 
                      type="number" 
                      value={formData.price_coins} 
                      onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })} 
                      disabled={formData.is_free} 
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_free} 
                      onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })} 
                    />
                    <Label>Free</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_active} 
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} 
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avatars?.map((avatar) => (
              <TableRow key={avatar.id}>
                <TableCell>
                  <div className="w-12 h-12 rounded-md bg-muted overflow-hidden relative">
                    {avatar.preview_image_url ? (
                      <img 
                        src={avatar.preview_image_url} 
                        alt={avatar.name} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(avatar.preview_image_url)}
                        title="Click to enlarge"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🏃</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{avatar.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{avatar.character_prompt}</p>
                </TableCell>
                <TableCell>
                  {avatar.is_free ? (
                    <Badge variant="secondary">Free</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Coins className="h-3 w-3" />{avatar.price_coins}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => toggleActiveMutation.mutate({ id: avatar.id, is_active: !avatar.is_active })}
                  >
                    {avatar.is_active ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    {/* Download button */}
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleDownloadImage(avatar)}
                      disabled={!avatar.preview_image_url}
                      title="Download image"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    {/* Upload button */}
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => document.getElementById(`upload-${avatar.id}`)?.click()}
                      disabled={uploadingFor === avatar.id}
                      title="Upload new image"
                    >
                      {uploadingFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <input
                      id={`upload-${avatar.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(avatar.id, file);
                        e.target.value = "";
                      }}
                    />
                    
                    {/* Remove background button */}
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleRemoveBackground(avatar)}
                      disabled={removingBgFor === avatar.id || !avatar.preview_image_url}
                      title="Remove background (white bg)"
                    >
                      {removingBgFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eraser className="h-4 w-4 text-pink-600" />
                      )}
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleTestWorkoutImage(avatar)}
                      disabled={generatingWorkoutTest === avatar.id || !avatar.character_prompt}
                      title="Test workout image (random workout + location)"
                    >
                      {generatingWorkoutTest === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-orange-600" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleGenerateImage(avatar)}
                      disabled={generatingImageFor === avatar.id || !avatar.character_prompt}
                      title={avatar.preview_image_url ? "Regenerate AI image" : "Generate AI image"}
                    >
                      {generatingImageFor === avatar.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : avatar.preview_image_url ? (
                        <RefreshCw className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Wand2 className="h-4 w-4 text-purple-600" />
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={() => handleEdit(avatar)} 
                      title="Edit avatar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-destructive" 
                      onClick={() => { if (confirm("Delete this avatar?")) deleteMutation.mutate(avatar.id); }} 
                      title="Delete avatar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {avatars?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No avatars yet. Click "Add Avatar" and use "Randomize Character" to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImage ? [{ image_url: lightboxImage }] : []}
        currentIndex={0}
        isOpen={lightboxOpen}
        onClose={() => {
          setLightboxOpen(false);
          setLightboxImage(null);
        }}
        onPrevious={() => {}}
        onNext={() => {}}
      />

      {/* Test Workout Image Result Dialog */}
      <Dialog open={workoutTestDialogOpen} onOpenChange={setWorkoutTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Test Workout Image Result</DialogTitle>
          </DialogHeader>
          {workoutTestResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Workout:</p>
                  <p className="text-lg font-semibold capitalize">{workoutTestResult.workout}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Location:</p>
                  <p className="text-lg font-semibold capitalize">{workoutTestResult.location}</p>
                </div>
              </div>
              {workoutTestResult.imageUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src={workoutTestResult.imageUrl} 
                    alt="Test workout" 
                    className="w-full h-auto cursor-pointer"
                    onClick={() => handleImageClick(workoutTestResult.imageUrl)}
                    title="Click to enlarge"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                This image was generated with a random workout and location to test the system.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
      </TabsContent>

      {/* Templates Tab */}
      <TabsContent value="templates">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Avatar Idea Templates
            </CardTitle>
            <p className="text-sm text-muted-foreground">Archive ideas to stop them from appearing in randomization</p>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Active: {activeTemplatesCount}</span>
                  <span>Archived: {archivedTemplatesCount}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avatarTemplates?.map((template) => (
                      <TableRow key={template.id} className={template.is_archived ? "opacity-50" : ""}>
                        <TableCell>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{template.prompt}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {template.character_type === 'animal' ? '🐾' : template.character_type === 'superhero' ? '🦸' : '👤'} {template.character_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {template.is_archived ? (
                            <Badge variant="secondary">Archived</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleArchiveMutation.mutate({ id: template.id, is_archived: !template.is_archived })}
                          >
                            {template.is_archived ? (
                              <><RotateCcw className="w-3 h-3 mr-1" />Restore</>
                            ) : (
                              <><Archive className="w-3 h-3 mr-1" />Archive</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
