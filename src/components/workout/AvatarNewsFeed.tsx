import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, Trophy, Dumbbell, Calendar } from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { WorkoutImageDetailDialog } from "./WorkoutImageDetailDialog";

interface AvatarNewsFeedProps {
  userId: string;
  includeTestImages?: boolean;
  userName?: string;
}

interface WorkoutImage {
  id: string;
  user_id: string;
  avatar_id: string;
  image_url: string;
  image_type: string;
  activity_name: string | null;
  location_name: string | null;
  location_pack_name?: string | null;
  is_shared_to_community: boolean;
  likes_count: number;
  is_test: boolean;
  created_at: string;
}

export const AvatarNewsFeed = ({ userId, includeTestImages = false, userName }: AvatarNewsFeedProps) => {
  const [selectedImage, setSelectedImage] = useState<WorkoutImage | null>(null);
  // Fetch user's images grouped by date (exclude test images unless specified)
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["workout-images-feed", userId, includeTestImages],
    queryFn: async () => {
      let query = supabase
        .from("workout_generated_images")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      // By default, exclude test images from the feed
      if (!includeTestImages) {
        query = query.eq("is_test", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorkoutImage[];
    },
    enabled: !!userId,
  });

  // Group images by date (using local timezone)
  const groupedImages = images.reduce((acc, image) => {
    // Parse as local date for grouping
    const imageDate = new Date(image.created_at);
    const date = format(imageDate, "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(image);
    return acc;
  }, {} as Record<string, WorkoutImage[]>);

  const formatDateHeader = (dateStr: string) => {
    // Parse the date string as local date (add time to avoid timezone shift)
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    const daysAgo = differenceInDays(new Date(), date);
    if (daysAgo < 7) return `${daysAgo} days ago`;
    return format(date, "EEEE, MMMM d");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium text-muted-foreground">No workout images yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Log activities to see your avatar in action!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Your Workout Journey</h3>
      </div>

      {Object.entries(groupedImages).map(([date, dayImages]) => (
        <div key={date} className="space-y-3">
          {/* Date Header */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              {formatDateHeader(date)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Images for this day */}
          <div className="grid grid-cols-2 gap-3">
            {dayImages.map((image) => (
              <Card 
                key={image.id} 
                className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => setSelectedImage(image)}
              >
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.activity_name || "Workout"}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Type indicator */}
                  <div className="absolute top-2 left-2">
                    {image.image_type === "celebration" ? (
                      <div className="bg-yellow-500 text-white p-1.5 rounded-full shadow-lg">
                        <Trophy className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                        <Dumbbell className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Overlay with info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
                    <p className="text-white text-xs font-medium truncate">
                      {image.image_type === "celebration" 
                        ? "🏆 Goal Achieved!" 
                        : image.activity_name || "Workout"}
                    </p>
                    {image.location_name && (
                      <p className="text-white/70 text-[10px] truncate">
                        📍 {image.location_name}
                      </p>
                    )}
                    <p className="text-white/50 text-[10px] mt-0.5">
                      {format(new Date(image.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <WorkoutImageDetailDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        image={selectedImage}
        userName={userName}
      />
    </div>
  );
};