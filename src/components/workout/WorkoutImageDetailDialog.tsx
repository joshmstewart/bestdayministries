import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MapPin, Clock, Activity, User, Package } from "lucide-react";

interface WorkoutImageDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: {
    image_url: string;
    activity_name?: string | null;
    location_name?: string | null;
    location_pack_name?: string | null;
    created_at: string;
    image_type: string;
  } | null;
  userName?: string;
}

export const WorkoutImageDetailDialog = ({
  open,
  onOpenChange,
  image,
  userName,
}: WorkoutImageDetailDialogProps) => {
  if (!image) return null;

  const createdAt = new Date(image.created_at);
  const formattedDate = format(createdAt, "EEEE, MMMM d, yyyy");
  const formattedTime = format(createdAt, "h:mm a");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden"
        onInteractOutside={(e) => {
          e.preventDefault();
          onOpenChange(false);
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          onOpenChange(false);
        }}
        onEscapeKeyDown={() => onOpenChange(false)}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Workout Image Details</DialogTitle>
        </DialogHeader>
        
        {/* Image */}
        <div className="aspect-square w-full">
          <img
            src={image.image_url}
            alt={image.activity_name || "Workout image"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* Title - Username + Activity */}
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            {userName && (
              <span>{userName}</span>
            )}
            {image.activity_name && (
              <span className="text-primary">{image.activity_name}!</span>
            )}
          </div>

          {/* Date */}
          <div className="text-sm text-muted-foreground">
            {formattedDate}
          </div>

          {/* Detail items */}
          <div className="space-y-2 pt-2 border-t border-border">
            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formattedTime}</span>
            </div>

            {/* Activity */}
            {image.activity_name && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>{image.activity_name}</span>
              </div>
            )}

            {/* Username */}
            {userName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{userName}</span>
              </div>
            )}

            {/* Location */}
            {image.location_name && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{image.location_name}</span>
              </div>
            )}

            {/* Location Pack */}
            {image.location_pack_name && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{image.location_pack_name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
