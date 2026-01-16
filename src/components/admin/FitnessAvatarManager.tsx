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
import { Plus, Edit, Trash2, Loader2, Coins, Eye, EyeOff, Wand2, Shuffle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";

const defaultFormData = {
  name: "", description: "", preview_image_url: "", character_prompt: "",
  is_free: false, price_coins: 100, display_order: 0, is_active: true,
};

// Character types for randomization - mix of animals and humans
const characterTypes = [
  // Animals
  { type: "animal", name: "Sporty Cat", prompt: "A friendly orange tabby cat with an athletic build, wearing a colorful headband and wristbands" },
  { type: "animal", name: "Power Panda", prompt: "A strong black and white panda bear with a muscular build, wearing athletic shorts and a tank top" },
  { type: "animal", name: "Flash Fox", prompt: "An energetic red fox with sleek fur, wearing running shoes and a tracksuit" },
  { type: "animal", name: "Mighty Mouse", prompt: "A small but determined gray mouse with big ears, wearing tiny workout gloves and sneakers" },
  { type: "animal", name: "Bounce Bunny", prompt: "A fluffy white rabbit with pink ears, athletic build, wearing a sports jersey" },
  { type: "animal", name: "Strong Bear", prompt: "A friendly brown bear with powerful arms, wearing gym clothes and lifting gloves" },
  { type: "animal", name: "Swift Deer", prompt: "A graceful spotted deer with long legs, wearing a runner's outfit" },
  { type: "animal", name: "Flex Frog", prompt: "A bright green frog with strong legs, wearing athletic shorts and wristbands" },
  { type: "animal", name: "Dash Dog", prompt: "A golden retriever with a friendly face, wearing a sports bandana and running shoes" },
  { type: "animal", name: "Owl Coach", prompt: "A wise brown owl with big eyes, wearing a coach's whistle and cap" },
  { type: "animal", name: "Tiger Trainer", prompt: "An orange tiger with black stripes, athletic build, wearing training gear" },
  { type: "animal", name: "Penguin Pal", prompt: "A cheerful black and white penguin, wearing a tiny workout headband" },
  
  // Humans - diverse and inclusive
  { type: "human", name: "Coach Casey", prompt: "A friendly adult coach with short hair, warm smile, wearing athletic polo and whistle around neck" },
  { type: "human", name: "Zara Zoom", prompt: "A young Black girl with curly hair in puffs, athletic build, wearing bright colored activewear" },
  { type: "human", name: "Marcus Move", prompt: "A young Latino boy with wavy hair, enthusiastic expression, wearing basketball jersey" },
  { type: "human", name: "Kim Kick", prompt: "A young Asian girl with straight black hair in ponytail, wearing martial arts outfit" },
  { type: "human", name: "Super Sam", prompt: "A young boy with Down syndrome, big smile, wearing a superhero cape over workout clothes" },
  { type: "human", name: "Wheels Wendy", prompt: "A young girl in a sporty wheelchair, brown pigtails, wearing athletic gear, confident expression" },
  { type: "human", name: "Jumping Jack", prompt: "A young boy with red hair and freckles, energetic pose, wearing gym clothes" },
  { type: "human", name: "Yoga Yara", prompt: "A young South Asian girl with long braided hair, peaceful expression, wearing yoga attire" },
  { type: "human", name: "Dancing Devon", prompt: "A young nonbinary child with short colorful hair, wearing dance outfit with leg warmers" },
  { type: "human", name: "Swimmer Sofia", prompt: "A young girl with swim cap and goggles on head, athletic swimsuit, confident pose" },
  { type: "human", name: "Runner Ray", prompt: "A young African American boy with short hair, wearing running gear and race number" },
  { type: "human", name: "Gymnast Grace", prompt: "A young girl with hair in bun, wearing a sparkly leotard, graceful pose" },
];

export function FitnessAvatarManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatingInDialog, setGeneratingInDialog] = useState(false);

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-fitness-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fitness_avatars").select("*").order("display_order");
      if (error) throw error;
      return data;
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
    mutationFn: async (avatar: { id: string; name: string; character_prompt: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-avatar-image", {
        body: { avatarId: avatar.id, characterPrompt: avatar.character_prompt, name: avatar.name },
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
      is_active: avatar.is_active 
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
        character_prompt: formData.character_prompt 
      });
    }
  };

  const handleRandomize = () => {
    // Filter out characters already used
    const usedNames = new Set(avatars?.map(a => a.name.toLowerCase()) || []);
    const availableCharacters = characterTypes.filter(c => !usedNames.has(c.name.toLowerCase()));
    const pool = availableCharacters.length > 0 ? availableCharacters : characterTypes;
    
    const randomChar = pool[Math.floor(Math.random() * pool.length)];
    
    setFormData(prev => ({
      ...prev,
      name: randomChar.name,
      description: `A ${randomChar.type === 'animal' ? 'friendly animal' : 'friendly human'} character who loves fitness and can do any sport!`,
      character_prompt: randomChar.prompt,
      display_order: avatars?.length || 0,
    }));
    
    toast.success(`Randomized: ${randomChar.name}`, { 
      description: `${randomChar.type === 'animal' ? '🐾 Animal' : '👤 Human'} character` 
    });
  };

  const handleGenerateImage = (avatar: any) => {
    if (!avatar.character_prompt) {
      toast.error("Character prompt is required to generate an image");
      return;
    }
    setGeneratingImageFor(avatar.id);
    toast.info("✨ Generating avatar image...", { description: "This may take a moment." });
    generateImageMutation.mutate({ id: avatar.id, name: avatar.name, character_prompt: avatar.character_prompt });
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
      character_prompt: formData.character_prompt 
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
      });
    } catch (error) {
      setGeneratingInDialog(false);
      showErrorToastWithCopy("Failed to save avatar", error);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fitness Avatars</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Mix of animal and human characters for workouts</p>
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
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <span className="text-xs text-muted-foreground">Current preview</span>
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
                      <img src={avatar.preview_image_url} alt={avatar.name} className="w-full h-full object-cover" />
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
                  <div className="flex items-center justify-end gap-1">
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
    </Card>
  );
}
