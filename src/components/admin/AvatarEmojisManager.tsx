import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X, RefreshCw, Trash2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Avatar {
  avatar_number: number;
  category: string;
}

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
}

interface AvatarEmotionImage {
  id: string;
  avatar_number: number;
  emotion_type_id: string;
  image_url: string | null;
  prompt_used: string | null;
  generation_notes: string | null;
  is_approved: boolean;
  created_at: string;
}

export function AvatarEmojisManager() {
  const { toast } = useToast();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [emotions, setEmotions] = useState<EmotionType[]>([]);
  const [existingImages, setExistingImages] = useState<AvatarEmotionImage[]>([]);
  
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generationNotes, setGenerationNotes] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [avatarsRes, emotionsRes, imagesRes] = await Promise.all([
        supabase.from("avatars").select("avatar_number, category").eq("is_active", true).order("avatar_number"),
        supabase.from("emotion_types").select("id, name, emoji, color, category").eq("is_active", true).order("display_order"),
        supabase.from("avatar_emotion_images").select("*").order("created_at", { ascending: false })
      ]);

      if (avatarsRes.data) setAvatars(avatarsRes.data);
      if (emotionsRes.data) setEmotions(emotionsRes.data);
      if (imagesRes.data) setExistingImages(imagesRes.data as AvatarEmotionImage[]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedEmotionDetails = () => {
    return emotions.find(e => e.id === selectedEmotion);
  };

  const getExistingImage = () => {
    if (!selectedAvatar || !selectedEmotion) return null;
    return existingImages.find(
      img => img.avatar_number === selectedAvatar && img.emotion_type_id === selectedEmotion
    );
  };

  const buildDefaultPrompt = () => {
    const emotion = getSelectedEmotionDetails();
    if (!emotion || !selectedAvatar) return "";
    
    return `A cute, friendly character (avatar #${selectedAvatar}) expressing the emotion "${emotion.name}" (${emotion.emoji}). 
The character should clearly show this ${emotion.category} emotion through their facial expression and body language.
Style: Warm, approachable, suitable for adults with intellectual disabilities. 
Background: Simple, non-distracting, using the color ${emotion.color} as an accent.
The image should be positive and encouraging, even for challenging emotions.`;
  };

  const handleGenerate = async () => {
    if (!selectedAvatar || !selectedEmotion) {
      toast({ title: "Please select both an avatar and emotion", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      const promptToUse = customPrompt.trim() || buildDefaultPrompt();
      
      // Call the AI gateway to generate the image
      const response = await supabase.functions.invoke("generate-avatar-emotion-image", {
        body: {
          avatarNumber: selectedAvatar,
          emotionTypeId: selectedEmotion,
          prompt: promptToUse,
          notes: generationNotes
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Generation failed");
      }

      if (response.data?.imageUrl) {
        setGeneratedImageUrl(response.data.imageUrl);
        toast({ title: "Image generated!", description: "Review and approve or regenerate." });
        await loadData(); // Refresh to get the new image
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ 
        title: "Generation failed", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("avatar_emotion_images")
        .update({ is_approved: true })
        .eq("id", imageId);

      if (error) throw error;
      
      toast({ title: "Image approved!" });
      await loadData();
    } catch (error) {
      toast({ title: "Error approving image", variant: "destructive" });
    }
  };

  const handleReject = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from("avatar_emotion_images")
        .update({ is_approved: false })
        .eq("id", imageId);

      if (error) throw error;
      
      toast({ title: "Image marked as not approved" });
      await loadData();
    } catch (error) {
      toast({ title: "Error updating image", variant: "destructive" });
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image? You can regenerate it later.")) return;
    
    try {
      const { error } = await supabase
        .from("avatar_emotion_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;
      
      toast({ title: "Image deleted" });
      setGeneratedImageUrl(null);
      await loadData();
    } catch (error) {
      toast({ title: "Error deleting image", variant: "destructive" });
    }
  };

  const existingImage = getExistingImage();
  const selectedEmotionDetails = getSelectedEmotionDetails();

  // Stats
  const totalCombinations = avatars.length * emotions.length;
  const generatedCount = existingImages.length;
  const approvedCount = existingImages.filter(img => img.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalCombinations}</div>
            <div className="text-sm text-muted-foreground">Total Combinations</div>
            <div className="text-xs text-muted-foreground mt-1">
              {avatars.length} avatars × {emotions.length} emotions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{generatedCount}</div>
            <div className="text-sm text-muted-foreground">Generated</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((generatedCount / totalCombinations) * 100).toFixed(1)}% complete
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-xs text-muted-foreground mt-1">
              {generatedCount > 0 ? ((approvedCount / generatedCount) * 100).toFixed(1) : 0}% of generated
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Avatar Emotion Image
          </CardTitle>
          <CardDescription>
            Select an avatar and emotion, then generate and iterate until you're happy with the result.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Avatar Selection */}
            <div className="space-y-2">
              <Label>Avatar</Label>
              <Select 
                value={selectedAvatar?.toString() || ""} 
                onValueChange={(v) => setSelectedAvatar(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select avatar..." />
                </SelectTrigger>
                <SelectContent>
                  {avatars.map((avatar) => (
                    <SelectItem key={avatar.avatar_number} value={avatar.avatar_number.toString()}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={`/avatars/composite-${avatar.avatar_number}.png`} 
                          alt={`Avatar ${avatar.avatar_number}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span>Avatar {avatar.avatar_number}</span>
                        <Badge variant="outline" className="text-xs">{avatar.category}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Emotion Selection */}
            <div className="space-y-2">
              <Label>Emotion</Label>
              <Select 
                value={selectedEmotion || ""} 
                onValueChange={setSelectedEmotion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select emotion..." />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map((emotion) => (
                    <SelectItem key={emotion.id} value={emotion.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emotion.emoji}</span>
                        <span>{emotion.name}</span>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: emotion.color, color: emotion.color }}
                        >
                          {emotion.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label>Custom Prompt (optional)</Label>
            <Textarea
              placeholder={buildDefaultPrompt() || "Select avatar and emotion to see default prompt..."}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default prompt shown above. Edit to customize the generation.
            </p>
          </div>

          {/* Generation Notes */}
          <div className="space-y-2">
            <Label>Notes for this generation</Label>
            <Textarea
              placeholder="Add notes about what you want to change, feedback, etc..."
              value={generationNotes}
              onChange={(e) => setGenerationNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={!selectedAvatar || !selectedEmotion || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : existingImage ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Image
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview / Result */}
      {(existingImage || generatedImageUrl) && selectedEmotionDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Result Preview</span>
              {existingImage && (
                <Badge variant={existingImage.is_approved ? "default" : "secondary"}>
                  {existingImage.is_approved ? "Approved" : "Not Approved"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div className="space-y-4">
                <AspectRatio ratio={1} className="bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={generatedImageUrl || existingImage?.image_url || ""} 
                    alt={`Avatar ${selectedAvatar} - ${selectedEmotionDetails.name}`}
                    className="w-full h-full object-cover"
                  />
                </AspectRatio>
                
                {/* Action Buttons */}
                {existingImage && (
                  <div className="flex gap-2">
                    {!existingImage.is_approved ? (
                      <Button 
                        onClick={() => handleApprove(existingImage.id)}
                        className="flex-1"
                        variant="default"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleReject(existingImage.id)}
                        className="flex-1"
                        variant="outline"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Unapprove
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleDelete(existingImage.id)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Combination</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`/avatars/composite-${selectedAvatar}.png`} 
                        alt={`Avatar ${selectedAvatar}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <span className="text-sm">Avatar {selectedAvatar}</span>
                    </div>
                    <span className="text-muted-foreground">+</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedEmotionDetails.emoji}</span>
                      <span className="text-sm">{selectedEmotionDetails.name}</span>
                    </div>
                  </div>
                </div>

                {existingImage?.prompt_used && (
                  <div>
                    <h4 className="font-medium mb-2">Prompt Used</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {existingImage.prompt_used}
                    </p>
                  </div>
                )}

                {existingImage?.generation_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">
                      {existingImage.generation_notes}
                    </p>
                  </div>
                )}

                {existingImage?.created_at && (
                  <div className="text-xs text-muted-foreground">
                    Generated: {new Date(existingImage.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery of Existing Images */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Images Gallery</CardTitle>
          <CardDescription>
            All generated avatar emotion images. Click to select for editing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingImages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No images generated yet. Select an avatar and emotion above to get started!
            </p>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {existingImages.map((img) => {
                const emotion = emotions.find(e => e.id === img.emotion_type_id);
                return (
                  <button
                    key={img.id}
                    onClick={() => {
                      setSelectedAvatar(img.avatar_number);
                      setSelectedEmotion(img.emotion_type_id);
                      setGeneratedImageUrl(img.image_url);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedAvatar === img.avatar_number && selectedEmotion === img.emotion_type_id
                        ? "border-primary ring-2 ring-primary/20"
                        : img.is_approved 
                          ? "border-green-500/50" 
                          : "border-transparent"
                    }`}
                  >
                    <AspectRatio ratio={1}>
                      <img 
                        src={img.image_url || ""} 
                        alt={`Avatar ${img.avatar_number} - ${emotion?.name}`}
                        className="w-full h-full object-cover"
                      />
                    </AspectRatio>
                    {img.is_approved && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 flex items-center justify-center gap-1">
                      <span>{emotion?.emoji}</span>
                      <span>#{img.avatar_number}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
