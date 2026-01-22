import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useState } from "react";

export const NotificationList = () => {
  const { 
    groupedNotifications, 
    loading, 
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick 
  } = useNotifications();
  
  // Mark all notifications in a group as read
  const markGroupAsRead = async (notifications: any[]) => {
    for (const notification of notifications) {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    }
  };
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b gap-2">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {groupedNotifications.length > 0 && (
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
        ) : groupedNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {groupedNotifications.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const showExpand = group.count > 1;
              
              return (
                <Collapsible
                  key={group.id}
                  open={isExpanded}
                  onOpenChange={() => showExpand && toggleGroup(group.id)}
                >
                  <Card
                    className={`p-4 transition-colors group relative border-0 rounded-none ${
                      !group.is_read 
                        ? "bg-primary/5" 
                        : group.auto_resolved 
                          ? "opacity-75 bg-muted/20" 
                          : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        !group.is_read ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div 
                          className={`flex items-center gap-2 ${showExpand ? 'cursor-pointer' : 'cursor-pointer'}`}
                          onClick={() => {
                            if (!showExpand) {
                              handleNotificationClick(group.notifications[0]);
                            } else if (!group.is_read) {
                              // Mark all notifications in this group as read
                              markGroupAsRead(group.notifications);
                            }
                          }}
                        >
                          <p className="font-medium text-sm break-words flex-1">{group.title}</p>
                          {showExpand && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                          {group.count > 1 && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {group.count}
                            </Badge>
                          )}
                          {group.auto_resolved && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                              ✓
                            </Badge>
                          )}
                          {!group.is_read && !group.auto_resolved && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        
                        {!showExpand && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1 break-words">
                              {group.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(group.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </>
                        )}
                        
                        {showExpand && (
                          <CollapsibleContent className="mt-3">
                            <div className="space-y-2">
                              {group.notifications.map((notification: any) => (
                                <div
                                  key={notification.id}
                                  className="p-2 rounded-md border bg-card hover:bg-muted cursor-pointer text-sm group/item relative"
                                  onClick={() => handleNotificationClick(notification)}
                                >
                                  <p className="font-medium text-xs mb-1 pr-6">{notification.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        )}
                      </div>
                    </div>
                    {!showExpand && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(group.notifications[0].id);
                        }}
                        title="Delete notification"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
