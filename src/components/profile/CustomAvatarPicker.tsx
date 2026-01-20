import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Image, Wand2, Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface CustomAvatarPickerProps {
  userId: string;
  currentCustomAvatarUrl?: string | null;
  currentCustomAvatarType?: string | null;
  onAvatarChange: (url: string | null, type: string | null) => void;
}

export function CustomAvatarPicker({
  userId,
  currentCustomAvatarUrl,
  currentCustomAvatarType,
  onAvatarChange,
}: CustomAvatarPickerProps) {
  const queryClient = useQueryClient();
  const [sceneDescription, setSceneDescription] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  // Fetch user's selected fitness avatar
  const { data: selectedAvatar, isLoading: avatarLoading } = useQuery({
    queryKey: ["selected-fitness-avatar", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, fitness_avatars(*)")
        .eq("user_id", userId)
        .eq("is_selected", true)
        .single();

      if (error || !data?.fitness_avatars) return null;
      return data.fitness_avatars as any;
    },
  });

  // Generate custom scene mutation
  const generateMutation = useMutation({
    mutationFn: async (description: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-profile-avatar", {
        body: { sceneDescription: description },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedPreview(data.imageUrl);
      toast.success("Avatar generated! Click 'Use This Avatar' to save it.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate avatar");
    },
  });

  // Save avatar selection mutation
  const saveMutation = useMutation({
    mutationFn: async ({ url, type }: { url: string | null; type: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          custom_avatar_url: url,
          custom_avatar_type: type,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      onAvatarChange(variables.url, variables.type);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile avatar updated!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save avatar");
    },
  });

  const handleUseFitnessAvatar = () => {
    if (!selectedAvatar) return;
    const avatarUrl = selectedAvatar.image_url || selectedAvatar.preview_image_url;
    saveMutation.mutate({ url: avatarUrl, type: "fitness_avatar" });
  };

  const handleUseGeneratedAvatar = () => {
    if (!generatedPreview) return;
    saveMutation.mutate({ url: generatedPreview, type: "generated_scene" });
  };

  const handleClearCustomAvatar = () => {
    saveMutation.mutate({ url: null, type: null });
    setGeneratedPreview(null);
  };

  const hasSelectedFitnessAvatar = !!selectedAvatar;
  const fitnessAvatarUrl = selectedAvatar?.image_url || selectedAvatar?.preview_image_url;

  if (avatarLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-2 shadow-warm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Custom Profile Avatar
        </CardTitle>
        <CardDescription>
          Use your fitness avatar as your profile picture, or generate a custom scene
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current custom avatar display */}
        {currentCustomAvatarUrl && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage src={currentCustomAvatarUrl} alt="Current custom avatar" />
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">Current Custom Avatar</p>
              <p className="text-sm text-muted-foreground">
                {currentCustomAvatarType === "fitness_avatar" 
                  ? "Using your fitness avatar"
                  : "Custom generated scene"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCustomAvatar}>
              Clear
            </Button>
          </div>
        )}

        {!hasSelectedFitnessAvatar ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Fitness Avatar Selected</p>
              <p className="text-sm text-muted-foreground">
                Visit the Fitness Center to choose or purchase a fitness avatar first
              </p>
            </div>
            <Button asChild>
              <Link to="/games/workout-tracker">
                Go to Fitness Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="use-existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="use-existing" className="gap-2">
                <Image className="h-4 w-4" />
                Use Fitness Avatar
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generate Scene
              </TabsTrigger>
            </TabsList>

            <TabsContent value="use-existing" className="space-y-4 mt-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-primary/20">
                  <AvatarImage src={fitnessAvatarUrl} alt="Fitness avatar" />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-medium">{selectedAvatar.name}</p>
                  <p className="text-sm text-muted-foreground">Your selected fitness avatar</p>
                </div>
                <Button 
                  onClick={handleUseFitnessAvatar}
                  disabled={saveMutation.isPending || currentCustomAvatarUrl === fitnessAvatarUrl}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : currentCustomAvatarUrl === fitnessAvatarUrl ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {currentCustomAvatarUrl === fitnessAvatarUrl ? "Currently Active" : "Use as Profile Avatar"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="scene-description">Describe the scene</Label>
                <Input
                  id="scene-description"
                  placeholder="e.g., playing basketball, reading a book, at the beach..."
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  disabled={generateMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Your fitness avatar will be shown in this scene
                </p>
              </div>

              <Button
                onClick={() => generateMutation.mutate(sceneDescription)}
                disabled={!sceneDescription.trim() || generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Avatar
                  </>
                )}
              </Button>

              {generatedPreview && (
                <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-accent/5">
                  <Avatar className="h-32 w-32 border-4 border-primary/20">
                    <AvatarImage src={generatedPreview} alt="Generated avatar" />
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  <Button 
                    onClick={handleUseGeneratedAvatar}
                    disabled={saveMutation.isPending}
                    className="w-full"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Use This Avatar
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
