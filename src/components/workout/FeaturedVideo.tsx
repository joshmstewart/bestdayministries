import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Play, Loader2, ChevronRight, Video } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { awardCoinReward } from "@/utils/awardCoinReward";

interface FeaturedVideoProps {
  userId: string;
  className?: string;
}

export const FeaturedVideo = ({ userId, className }: FeaturedVideoProps) => {
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  // Fetch a random featured video
  const { data: featuredVideo, isLoading } = useQuery({
    queryKey: ["workout-featured-video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_videos")
        .select("*, workout_categories(name, icon)")
        .eq("is_active", true)
        .limit(5);
      
      if (error) throw error;
      // Return a random one
      if (data && data.length > 0) {
        return data[Math.floor(Math.random() * data.length)];
      }
      return null;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch all videos for the browse section
  const { data: allVideos = [] } = useQuery({
    queryKey: ["workout-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_videos")
        .select("*, workout_categories(name, icon)")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch completed videos this week
  const { data: completedVideos = [] } = useQuery({
    queryKey: ["workout-logs-videos", userId, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_logs")
        .select("video_id")
        .eq("user_id", userId)
        .eq("workout_type", "video")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());
      
      if (error) throw error;
      return data.map(log => log.video_id);
    },
  });

  const logWorkoutMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("user_workout_logs")
        .insert({
          user_id: userId,
          workout_type: "video",
          video_id: videoId,
        });
      if (error) throw error;
    },
    onSuccess: async () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff6b35', '#ffa726', '#ffcc02'],
      });
      
      // Award coins for completing a workout
      await awardCoinReward(userId, 'workout_complete', 'Completed a workout');
      
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
      queryClient.invalidateQueries({ queryKey: ["workout-streak-logs"] });
      toast.success("Workout completed! 💪");
      setSelectedVideo(null);
    },
    onError: () => {
      toast.error("Failed to log workout");
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!featuredVideo) {
    return null;
  }

  const isCompleted = completedVideos.includes(featuredVideo.id);

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        {/* Featured Video Hero */}
        <div 
          className="relative bg-gradient-to-br from-purple-600 to-indigo-700 p-4 cursor-pointer group"
          onClick={() => setSelectedVideo(featuredVideo)}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
              isCompleted ? "bg-green-500" : "bg-white/20"
            )}>
              {isCompleted ? (
                <CheckCircle className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1 text-white">
              <div className="text-xs uppercase tracking-wider opacity-75 mb-1">
                Today's Workout
              </div>
              <h3 className="font-bold text-lg">{featuredVideo.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/20 text-white border-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {featuredVideo.duration_minutes} min
                </Badge>
                <Badge className={cn("border-0", getDifficultyColor(featuredVideo.difficulty))}>
                  {featuredVideo.difficulty}
                </Badge>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-white opacity-75" />
          </div>
        </div>

        {/* More Videos Grid */}
        {allVideos.length > 1 && (
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">More Workouts</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allVideos.slice(0, 6).map((video) => {
                const completed = completedVideos.includes(video.id);
                return (
                  <Button
                    key={video.id}
                    variant="outline"
                    className={cn(
                      "flex-shrink-0 h-auto py-2 px-3 gap-2",
                      completed && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20"
                    )}
                    onClick={() => setSelectedVideo(video)}
                  >
                    {completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="text-sm">{video.duration_minutes}m</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="space-y-4">
              <YouTubeEmbed url={selectedVideo.youtube_url} title={selectedVideo.title} />
              
              {selectedVideo.description && (
                <p className="text-muted-foreground">{selectedVideo.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedVideo.duration_minutes} min
                  </Badge>
                  <Badge className={getDifficultyColor(selectedVideo.difficulty)}>
                    {selectedVideo.difficulty}
                  </Badge>
                </div>
                
                <Button 
                  onClick={() => logWorkoutMutation.mutate(selectedVideo.id)}
                  disabled={logWorkoutMutation.isPending || completedVideos.includes(selectedVideo.id)}
                  size="lg"
                >
                  {logWorkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : completedVideos.includes(selectedVideo.id) ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : null}
                  {completedVideos.includes(selectedVideo.id) ? "Completed ✓" : "I Did It! 💪"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
