import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/ShareButtons";

interface EventDate {
  id: string;
  event_date: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  audio_url: string | null;
  event_date: string;
  location: string | null;
  max_attendees: number | null;
  expires_after_date: boolean;
  is_recurring: boolean;
  is_public?: boolean;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  event_dates?: EventDate[];
}

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allDates?: Date[];
  displayDate?: Date;
}

export function EventDetailDialog({ event, open, onOpenChange, allDates = [], displayDate }: EventDetailDialogProps) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* Content area - takes up remaining space */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-2xl flex-shrink-0">{event.title}</DialogTitle>
                <TextToSpeech text={`${event.title}. ${event.description}`} />
              </div>
            </div>
            
            {/* Action buttons container - aligned to right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {event.image_url && (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full max-h-[60vh] object-contain rounded-lg"
            />
          )}

          {event.is_recurring && (
            <div className="inline-block">
              <span className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                Recurring {event.recurrence_type === "custom" ? `every ${event.recurrence_interval}` : event.recurrence_type}
              </span>
            </div>
          )}

          <div className="prose prose-sm max-w-none">
            <p className="text-base leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Display primary date prominently if provided */}
          {displayDate && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="text-sm font-semibold text-muted-foreground mb-2">
                Featured Date:
              </div>
              <div className="flex items-center gap-3 text-lg font-semibold">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {format(displayDate, "PPPP")}
              </div>
              <div className="flex items-center gap-3 text-base mt-2">
                <Clock className="w-4 h-4 text-primary" />
                {format(displayDate, "p")}
              </div>
            </div>
          )}

          {/* Show all dates if there are multiple */}
          {allDates.length > 1 && (
            <div className="space-y-3">
              <div className="font-semibold text-base">All Event Dates:</div>
              <div className="grid gap-2">
                {allDates.map((date, idx) => {
                  const isPast = date < new Date();
                  const isCurrent = displayDate && date.getTime() === displayDate.getTime();
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 rounded-lg border",
                        isCurrent && "bg-primary/20 border-primary",
                        !isCurrent && isPast && "opacity-50 bg-muted/50",
                        !isCurrent && !isPast && "bg-background"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <div className={cn("font-medium", isPast && "line-through")}>
                            {format(date, "EEEE, MMMM d, yyyy")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(date, "p")}
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full whitespace-nowrap",
                        isCurrent && "bg-primary text-primary-foreground font-semibold",
                        !isCurrent && isPast && "bg-muted text-muted-foreground",
                        !isCurrent && !isPast && "bg-primary/10 text-primary"
                      )}>
                        {isCurrent ? "This Date" : isPast ? "Passed" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {event.location && (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">Location</div>
                <div className="text-base">{event.location}</div>
              </div>
            </div>
          )}

          {event.audio_url && (
            <div className="space-y-2">
              <div className="font-semibold text-sm">Audio Description</div>
              <AudioPlayer src={event.audio_url} />
            </div>
          )}

          {event.is_public && (
            <div className="pt-4 border-t">
              <ShareButtons
                title={event.title}
                description={event.description}
                url={`${window.location.origin}/community?tab=feed&eventId=${event.id}`}
                hashtags={['JoyHouse', 'CommunityEvent']}
                eventId={event.id}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}