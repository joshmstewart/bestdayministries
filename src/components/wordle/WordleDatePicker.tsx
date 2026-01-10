import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Check, X, ChevronDown, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface DateInfo {
  date: string;
  theme: string | null;
  themeEmoji: string | null;
  status: "won" | "lost" | "in_progress" | "not_played";
  isToday: boolean;
}

interface WordleDatePickerProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function WordleDatePicker({ 
  selectedDate, 
  onDateSelect,
  externalOpen,
  onExternalOpenChange 
}: WordleDatePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [today, setToday] = useState<string>("");

  // Use external open state if provided, otherwise use internal
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  useEffect(() => {
    const loadDates = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-wordle-dates");
        
        if (error) throw error;
        
        setDates(data.dates || []);
        setToday(data.today);
      } catch (err) {
        console.error("Error loading dates:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDates();
  }, []);

  const handleSelect = (date: string) => {
    onDateSelect(date);
    setOpen(false);
  };

  const currentDateInfo = dates.find(d => d.date === selectedDate);
  const displayDate = selectedDate || today;

  const getStatusIcon = (status: DateInfo["status"]) => {
    switch (status) {
      case "won":
        return <Check className="h-4 w-4 text-green-500" />;
      case "lost":
        return <X className="h-4 w-4 text-red-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: DateInfo["status"]) => {
    switch (status) {
      case "won": return "Completed";
      case "lost": return "Failed";
      case "in_progress": return "In Progress";
      default: return "Not Played";
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Calendar className="h-4 w-4" />
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          {displayDate ? (
            <>
              {format(parseISO(displayDate), "MMM d, yyyy")}
              {currentDateInfo?.isToday && " (Today)"}
            </>
          ) : (
            "Select Date"
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Play Past Puzzles</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Past games count for stats but not streak
          </p>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {dates.map((dateInfo) => (
              <button
                key={dateInfo.date}
                onClick={() => handleSelect(dateInfo.date)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-muted",
                  selectedDate === dateInfo.date && "bg-primary/10 border border-primary"
                )}
              >
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center gap-2">
                    {format(parseISO(dateInfo.date), "EEEE, MMM d")}
                    {dateInfo.isToday && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>
                  {dateInfo.theme && (
                    <div className="text-xs text-muted-foreground">
                      {dateInfo.themeEmoji} {dateInfo.theme}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(dateInfo.status)}
                  <span className={cn(
                    "text-xs",
                    dateInfo.status === "won" && "text-green-600",
                    dateInfo.status === "lost" && "text-red-600",
                    dateInfo.status === "in_progress" && "text-yellow-600",
                    dateInfo.status === "not_played" && "text-muted-foreground"
                  )}>
                    {getStatusLabel(dateInfo.status)}
                  </span>
                </div>
              </button>
            ))}
            {dates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No puzzles available yet
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
