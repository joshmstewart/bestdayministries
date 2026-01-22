import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "./NotificationList";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

export const NotificationBell = () => {
  const { unreadCount, markAllAsRead, notifications } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newlySeenIds, setNewlySeenIds] = useState<Set<string>>(new Set());
  const hasMarkedRead = useRef(false);

  // When popover opens, capture current unread IDs for visual indicator and mark all as read
  useEffect(() => {
    if (open && !hasMarkedRead.current) {
      // Capture IDs that were unread when opened (for visual "new" indicator)
      const unreadIds = new Set(
        notifications.filter(n => !n.is_read).map(n => n.id)
      );
      setNewlySeenIds(unreadIds);
      
      // Mark all as read (clears badge)
      if (unreadIds.size > 0) {
        markAllAsRead();
      }
      hasMarkedRead.current = true;
    } else if (!open) {
      // Reset when closed
      hasMarkedRead.current = false;
      setNewlySeenIds(new Set());
    }
  }, [open, notifications, markAllAsRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[90vw] p-0"
        align="end"
        sideOffset={8}
      >
        <NotificationList newlySeenIds={newlySeenIds} />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full justify-center"
            size="sm"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View All Notifications
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};