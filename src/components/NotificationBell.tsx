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
import { useState, useRef, useCallback } from "react";

export const NotificationBell = () => {
  const { unreadCount, markAllAsRead, notifications } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // IDs that were unread when popover opened - shown with visual highlight until popover closes
  const [newlySeenIds, setNewlySeenIds] = useState<Set<string>>(new Set());
  const hasMarkedRead = useRef(false);

  // Handle popover open/close - Facebook-style: mark all read on open, visual indicator until close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && !hasMarkedRead.current) {
      // Capture IDs that are currently unread BEFORE marking them read
      const currentUnreadIds = new Set(
        notifications.filter(n => !n.is_read).map(n => n.id)
      );
      setNewlySeenIds(currentUnreadIds);
      
      // Mark all as read immediately (clears badge count)
      if (currentUnreadIds.size > 0) {
        markAllAsRead();
      }
      hasMarkedRead.current = true;
    } else if (!isOpen) {
      // When closing, reset the visual indicator and allow fresh mark on next open
      hasMarkedRead.current = false;
      setNewlySeenIds(new Set());
    }
    setOpen(isOpen);
  }, [notifications, markAllAsRead]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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