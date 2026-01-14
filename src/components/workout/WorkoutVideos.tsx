import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek } from "date-fns";

interface WorkoutVideosProps {
  userId?: string;
}

export const WorkoutVideos = ({ userId }: WorkoutVideosProps) => {
  const queryClient = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  // Fetch videos with categories
  const { data: videos = [], isLoading } = useQuery({
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
      if (!userId) return [];
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
    enabled: !!userId,
  });

  const logWorkoutMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!userId) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("user_workout_logs")
        .insert({
          user_id: userId,
          workout_type: "video",
          video_id: videoId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-logs"] });
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No workout videos available yet.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {videos.map((video) => {
          const isCompleted = completedVideos.includes(video.id);
          return (
            <Card 
              key={video.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setSelectedVideo(video)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Play className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{video.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {video.duration_minutes} min
                      </Badge>
                      <Badge className={getDifficultyColor(video.difficulty)}>
                        {video.difficulty}
                      </Badge>
                      {video.workout_categories && (
                        <Badge variant="secondary" className="text-xs">
                          {video.workout_categories.icon} {video.workout_categories.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                
                {userId && (
                  <Button 
                    onClick={() => logWorkoutMutation.mutate(selectedVideo.id)}
                    disabled={logWorkoutMutation.isPending || completedVideos.includes(selectedVideo.id)}
                  >
                    {logWorkoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : completedVideos.includes(selectedVideo.id) ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : null}
                    {completedVideos.includes(selectedVideo.id) ? "Completed" : "Mark as Done"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
