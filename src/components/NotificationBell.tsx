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
  const { unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const hasMarkedRead = useRef(false);

  // Mark all as read when opening (orange highlight should be based ONLY on unread/read)
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && !hasMarkedRead.current) {
      if (unreadCount > 0) {
        markAllAsRead();
      }
      hasMarkedRead.current = true;
    } else if (!isOpen) {
      hasMarkedRead.current = false;
    }
    setOpen(isOpen);
  }, [unreadCount, markAllAsRead]);

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
        <NotificationList />
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