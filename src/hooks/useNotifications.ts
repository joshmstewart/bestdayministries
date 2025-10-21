import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  auto_resolved: boolean;
  metadata: any;
  created_at: string;
}

interface GroupedNotification {
  id: string; // Use first notification's ID as group ID
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  auto_resolved: boolean;
  created_at: string;
  count: number;
  notifications: Notification[];
  metadata: any;
}

const getGroupKey = (notification: Notification): string => {
  const { type, metadata } = notification;
  
  // Group by type + target
  switch (type) {
    case 'comment_on_post':
    case 'comment_on_thread':
      return `${type}-${metadata?.post_id || 'unknown'}`;
    case 'pending_approval':
      return `${type}-${metadata?.post_id || metadata?.comment_id || 'unknown'}`;
    case 'new_sponsor_message':
      return `${type}-${metadata?.bestie_id || 'unknown'}`;
    case 'moderation_needed':
      return `${type}-${metadata?.item_id || 'unknown'}`;
    default:
      // Don't group other types
      return `${type}-${notification.id}`;
  }
};

const groupNotifications = (notifications: Notification[]): GroupedNotification[] => {
  const groups = new Map<string, Notification[]>();
  
  // Group notifications by key
  notifications.forEach(notification => {
    const key = getGroupKey(notification);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(notification);
  });
  
  // Convert groups to grouped notifications
  return Array.from(groups.values()).map(group => {
    const first = group[0];
    const allRead = group.every(n => n.is_read);
    const allResolved = group.every(n => n.auto_resolved);
    
    // Create grouped title and message
    let title = first.title;
    let message = first.message;
    
    if (group.length > 1) {
      switch (first.type) {
        case 'comment_on_post':
          title = `${group.length} people commented on your post`;
          break;
        case 'comment_on_thread':
          title = `${group.length} new comments on a discussion`;
          break;
        case 'pending_approval':
          title = `${group.length} items need approval`;
          break;
        case 'new_sponsor_message':
          title = `${group.length} new messages from sponsors`;
          break;
        case 'moderation_needed':
          title = `${group.length} items need moderation`;
          break;
      }
    }
    
    return {
      id: first.id,
      type: first.type,
      title,
      message,
      link: first.link,
      is_read: allRead,
      auto_resolved: allResolved,
      created_at: group[0].created_at, // Most recent
      count: group.length,
      notifications: group,
      metadata: first.metadata,
    };
  });
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setGroupedNotifications(groupNotifications(data || []));
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      toast({
        title: "All notifications marked as read",
      });
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.is_read ? Math.max(0, prev - 1) : prev;
      });

      toast({
        title: "Notification deleted",
      });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const deleteAllRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", session.user.id)
        .eq("is_read", true);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !n.is_read));

      toast({
        title: "Read notifications cleared",
      });
    } catch (error: any) {
      console.error("Error deleting read notifications:", error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        if (mounted) setLoading(false);
        return;
      }

      await loadNotifications();
      
      if (!mounted) return;

      // Set up auth state change listener
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session && mounted) {
          loadNotifications();
        } else if (event === 'SIGNED_OUT') {
          setNotifications([]);
          setUnreadCount(0);
        }
      });

      if (!mounted) return;

      // Set up realtime subscription with user_id filter
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification inserted via realtime:', payload);
            if (mounted) loadNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification updated via realtime:', payload);
            if (mounted) loadNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Notification deleted via realtime:', payload);
            if (mounted) loadNotifications();
          }
        )
        .subscribe();

      cleanup = () => {
        authSubscription.unsubscribe();
        supabase.removeChannel(channel);
      };
    };

    init();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    handleNotificationClick,
    refreshNotifications: loadNotifications,
  };
};
