import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateImageParams {
  avatarId: string;
  activityName?: string;
  imageType: "activity" | "celebration";
  workoutLogId?: string;
}

export const useWorkoutImageGeneration = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Get user's selected avatar
  const { data: selectedAvatar } = useQuery({
    queryKey: ["user-selected-fitness-avatar", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, fitness_avatars(*)")
        .eq("user_id", userId!)
        .eq("is_selected", true)
        .single();

      if (error) {
        // Check for free avatars if no selection
        const { data: freeAvatar } = await supabase
          .from("fitness_avatars")
          .select("*")
          .eq("is_free", true)
          .order("display_order")
          .limit(1)
          .single();
        
        return freeAvatar;
      }
      
      return data?.fitness_avatars;
    },
    enabled: !!userId,
  });

  // Check if user met their weekly goal
  const { data: weeklyProgress } = useQuery({
    queryKey: ["workout-weekly-progress", userId],
    queryFn: async () => {
      // Get the start of the current week (Sunday)
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Get user's goal
      const { data: goalData } = await supabase
        .from("user_workout_goals")
        .select("weekly_activity_goal")
        .eq("user_id", userId!)
        .single();

      const goal = goalData?.weekly_activity_goal || 5;

      // Count this week's activities
      const { count } = await supabase
        .from("user_workout_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!)
        .gte("completed_at", startOfWeek.toISOString());

      return {
        goal,
        completed: count || 0,
        metGoal: (count || 0) >= goal,
      };
    },
    enabled: !!userId,
  });

  // Check if celebration image was already generated this week
  const { data: celebrationGenerated } = useQuery({
    queryKey: ["celebration-generated-this-week", userId],
    queryFn: async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("workout_generated_images")
        .select("id")
        .eq("user_id", userId!)
        .eq("image_type", "celebration")
        .gte("created_at", startOfWeek.toISOString())
        .limit(1);

      return (data?.length || 0) > 0;
    },
    enabled: !!userId,
  });

  const generateImageMutation = useMutation({
    mutationFn: async (params: GenerateImageParams) => {
      setIsGenerating(true);

      const { data, error } = await supabase.functions.invoke("generate-workout-image", {
        body: params,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.image;
    },
    onSuccess: (image) => {
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["celebration-generated-this-week"] });
      
      if (image.image_type === "celebration") {
        toast.success("🏆 Congrats! Your celebration image is ready!", {
          description: "Check your gallery to see it!",
          duration: 5000,
        });
      } else {
        toast.success("✨ Your workout image is ready!", {
          description: "Check your gallery to see it!",
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const generateActivityImage = async (activityName: string, workoutLogId?: string) => {
    if (!selectedAvatar?.id) {
      toast.error("Please select a fitness avatar first!");
      return;
    }

    await generateImageMutation.mutateAsync({
      avatarId: selectedAvatar.id,
      activityName,
      imageType: "activity",
      workoutLogId,
    });

    // Check if user just met their weekly goal
    if (weeklyProgress && !celebrationGenerated) {
      const newCompleted = (weeklyProgress.completed || 0) + 1;
      if (newCompleted >= weeklyProgress.goal) {
        // Generate celebration image too!
        setTimeout(async () => {
          toast.info("🎉 You met your weekly goal! Generating celebration image...");
          await generateImageMutation.mutateAsync({
            avatarId: selectedAvatar.id,
            imageType: "celebration",
          });
        }, 2000);
      }
    }
  };

  return {
    selectedAvatar,
    isGenerating,
    weeklyProgress,
    celebrationGenerated,
    generateActivityImage,
    generateCelebrationImage: () => {
      if (!selectedAvatar?.id) {
        toast.error("Please select a fitness avatar first!");
        return;
      }
      return generateImageMutation.mutateAsync({
        avatarId: selectedAvatar.id,
        imageType: "celebration",
      });
    },
  };
};
