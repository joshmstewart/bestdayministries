import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, X, Filter, Search, Calendar, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";

const NOTIFICATION_TYPES = {
  all: "All",
  pending_approval: "Approvals",
  moderation_needed: "Moderation",
  comment_on_post: "Comments",
  new_sponsor_message: "Messages",
  vendor_application: "Vendors",
  product_update: "Updates",
  content_like: "Likes",
};

export default function Notifications() {
  const navigate = useNavigate();
  const {
    groupedNotifications,
    loading,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    handleNotificationClick,
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
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

  // Filter grouped notifications
  const filteredNotifications = groupedNotifications.filter((group) => {
    const matchesSearch =
      group.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === "all" || group.type === selectedType;

    const notificationDate = new Date(group.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24));

    let matchesDate = true;
    if (dateFilter === "today") matchesDate = daysDiff === 0;
    else if (dateFilter === "week") matchesDate = daysDiff <= 7;
    else if (dateFilter === "month") matchesDate = daysDiff <= 30;

    return matchesSearch && matchesType && matchesDate;
  });

  const unreadNotifications = filteredNotifications.filter((n) => !n.is_read);
  const readNotifications = filteredNotifications.filter((n) => n.is_read);

  const NotificationCard = ({ group }: { group: any }) => {
    const isExpanded = expandedGroups.has(group.id);
    const showExpand = group.count > 1;
    
    return (
      <Card
        className={`p-4 transition-all hover:shadow-md group relative border ${
          !group.is_read
            ? "bg-primary/5 border-primary/20"
            : ""
        }`}
      >
        <Collapsible open={isExpanded} onOpenChange={() => showExpand && toggleGroup(group.id)}>
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-full ${
                !group.is_read ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div
                className={`flex items-center gap-2 flex-wrap ${showExpand ? '' : 'cursor-pointer'}`}
                onClick={() => !showExpand && handleNotificationClick(group.notifications[0])}
              >
                <p className="font-medium text-sm break-words flex-1">
                  {group.title}
                </p>
                {showExpand && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
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
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200 flex-shrink-0"
                  >
                    ✓ Resolved
                  </Badge>
                )}
                {!group.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
              
              {!showExpand && (
                <>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {group.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(group.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {NOTIFICATION_TYPES[group.type as keyof typeof NOTIFICATION_TYPES] || group.type}
                    </Badge>
                  </div>
                </>
              )}
              
              {showExpand && (
                <CollapsibleContent className="mt-3">
                  <div className="space-y-2">
                    {group.notifications.map((notification: any) => (
                      <div
                        key={notification.id}
                        className="p-3 rounded-md border bg-card hover:bg-muted cursor-pointer relative group/item"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p className="font-medium text-sm mb-1 pr-6">
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES] || notification.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          title="Delete notification"
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
        </Collapsible>
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
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button
            variant="outline"
            size="sm"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              Manage and view all your notifications in one place
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIFICATION_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <Check className="h-3 w-3 mr-2" />
                  Mark all as read ({unreadNotifications.length})
                </Button>
              )}
              {readNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteAllRead}
                >
                  <X className="h-3 w-3 mr-2" />
                  Clear read ({readNotifications.length})
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="unread" className="mb-8">
            <TabsList className="inline-flex flex-wrap h-auto">
              <TabsTrigger value="unread" className="whitespace-nowrap">
                Unread
                {unreadNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">
                Read
                {readNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {readNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">
                All
                {filteredNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unread" className="mt-6">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : unreadNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No unread notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unreadNotifications.map((group) => (
                    <NotificationCard
                      key={group.id}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="read" className="mt-6">
              {readNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No read notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readNotifications.map((group) => (
                    <NotificationCard
                      key={group.id}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedType !== "all" || dateFilter !== "all"
                      ? "No notifications match your filters"
                      : "No notifications yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((group) => (
                    <NotificationCard
                      key={group.id}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
