import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";

export const NotificationList = () => {
  const { 
    notifications, 
    loading, 
    markAllAsRead,
    deleteNotification,
    handleNotificationClick 
  } = useNotifications();

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b gap-2">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {notifications.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition-colors group relative border-0 rounded-none ${
                  !notification.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      !notification.is_read ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="font-medium text-sm break-words">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 break-words">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete notification"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
