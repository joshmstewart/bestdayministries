import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PicturePasswordNotification {
  id: string;
  user_id: string;
  notification_type: "feature_prompt" | "bestie_created_code";
  related_bestie_id: string | null;
  related_bestie_name: string | null;
  picture_sequence: string[] | null;
  is_read: boolean;
  dismissed_at: string | null;
  remind_after: string | null;
  dont_show_again: boolean;
  created_at: string;
}

interface LinkedBestie {
  id: string;
  display_name: string;
  hasPicturePassword: boolean;
}

export function usePicturePasswordNotifications() {
  const { user, role, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<PicturePasswordNotification[]>([]);
  const [linkedBesties, setLinkedBesties] = useState<LinkedBestie[]>([]);
  const [showFeaturePrompt, setShowFeaturePrompt] = useState(false);
  const [showBestieCreatedCode, setShowBestieCreatedCode] = useState(false);
  const [currentBestieNotification, setCurrentBestieNotification] = useState<PicturePasswordNotification | null>(null);
  const [userHasPicturePassword, setUserHasPicturePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const isGuardian = role === "caregiver" || role === "admin" || role === "owner";
  const isBestie = role === "bestie";

  // Check if user should see the feature prompt
  const checkFeaturePrompt = useCallback(async () => {
    if (!user) return false;

    // FIRST: Check if user has already dismissed with "don't show again" - this takes priority
    const { data: existingNotification } = await supabase
      .from("picture_password_notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("notification_type", "feature_prompt")
      .maybeSingle();

    if (existingNotification) {
      // If don't show again is set, NEVER show
      if (existingNotification.dont_show_again) {
        console.log("[PicturePassword] User has dont_show_again set, skipping prompt");
        return false;
      }
      
      // If remind_after is set and we're still before that date, don't show
      if (existingNotification.remind_after) {
        const remindDate = new Date(existingNotification.remind_after);
        if (new Date() < remindDate) {
          console.log("[PicturePassword] Remind date not reached yet, skipping prompt");
          return false;
        }
      }
    }

    // SECOND: Check if user already has a picture password - if so, check besties
    const { data: userPassword, error: userPasswordError } = await supabase
      .from("picture_passwords")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userPasswordError) {
      console.error("[PicturePassword] Error checking user password:", userPasswordError);
    }

    const userHasPassword = !!userPassword;
    setUserHasPicturePassword(userHasPassword);

    // For guardians, check if they or their linked besties don't have picture passwords
    if (isGuardian) {
      const { data: links, error: linksError } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id, profiles!caregiver_bestie_links_bestie_id_fkey(id, display_name)")
        .eq("caregiver_id", user.id);

      if (linksError) {
        console.error("[PicturePassword] Error fetching linked besties:", linksError);
      }

      if (links && links.length > 0) {
        const bestieIds = links.map(l => l.bestie_id);
        
        // Check which besties have picture passwords
        const { data: passwords, error: passwordsError } = await supabase
          .from("picture_passwords")
          .select("user_id")
          .in("user_id", bestieIds);

        if (passwordsError) {
          console.error("[PicturePassword] Error checking bestie passwords:", passwordsError);
        }

        const passwordUserIds = new Set(passwords?.map(p => p.user_id) || []);
        
        const bestiesData: LinkedBestie[] = links.map(link => ({
          id: link.bestie_id,
          display_name: (link.profiles as any)?.display_name || "Unknown",
          hasPicturePassword: passwordUserIds.has(link.bestie_id)
        }));

        setLinkedBesties(bestiesData);

        // Check if any besties still need picture passwords
        const hasUnsetBesties = bestiesData.some(b => !b.hasPicturePassword);
        
        // Only show if guardian doesn't have one OR there are besties without passwords
        const shouldShow = !userHasPassword || hasUnsetBesties;
        console.log("[PicturePassword] Guardian check:", { userHasPassword, hasUnsetBesties, shouldShow, bestiesData });
        return shouldShow;
      }

      // Guardian has no linked besties - only show if they don't have a picture password
      console.log("[PicturePassword] Guardian with no besties:", { userHasPassword });
      return !userHasPassword;
    }

    // For besties, check if they have a picture password
    if (isBestie) {
      console.log("[PicturePassword] Bestie check:", { userHasPassword });
      return !userHasPassword; // Show prompt if no picture password
    }

    return false;
  }, [user, isGuardian, isBestie]);

  // Check for unread "bestie created code" notifications
  const checkBestieCreatedNotifications = useCallback(async () => {
    if (!user || !isGuardian) return;

    const { data } = await supabase
      .from("picture_password_notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("notification_type", "bestie_created_code")
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setCurrentBestieNotification(data[0] as PicturePasswordNotification);
      setShowBestieCreatedCode(true);
    }
  }, [user, isGuardian]);

  // Initial check on login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const checkNotifications = async () => {
      setLoading(true);
      
      try {
        // Check for bestie created code notifications first (priority)
        await checkBestieCreatedNotifications();
        
        // Then check if we should show feature prompt
        const shouldShowPrompt = await checkFeaturePrompt();
        setShowFeaturePrompt(shouldShowPrompt);
      } catch (error) {
        console.error("Error checking notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to avoid showing immediately on page load
    const timer = setTimeout(checkNotifications, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, checkBestieCreatedNotifications, checkFeaturePrompt]);

  // Dismiss feature prompt with "maybe later" (7 days)
  const dismissMaybeLater = async () => {
    if (!user) return;

    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 7);

    // Check if notification exists
    const { data: existing } = await supabase
      .from("picture_password_notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("notification_type", "feature_prompt")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("picture_password_notifications")
        .update({
          remind_after: remindDate.toISOString(),
          dont_show_again: false
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("picture_password_notifications")
        .insert({
          user_id: user.id,
          notification_type: "feature_prompt",
          remind_after: remindDate.toISOString(),
          dont_show_again: false
        });
    }

    setShowFeaturePrompt(false);
  };

  // Dismiss feature prompt with "don't show again"
  const dismissDontShowAgain = async () => {
    if (!user) return;

    // Check if notification exists
    const { data: existing } = await supabase
      .from("picture_password_notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("notification_type", "feature_prompt")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("picture_password_notifications")
        .update({
          dont_show_again: true,
          dismissed_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("picture_password_notifications")
        .insert({
          user_id: user.id,
          notification_type: "feature_prompt",
          dont_show_again: true,
          dismissed_at: new Date().toISOString()
        });
    }

    setShowFeaturePrompt(false);
  };

  // Mark bestie created code notification as read
  const markBestieNotificationRead = async () => {
    if (!currentBestieNotification) return;

    await supabase
      .from("picture_password_notifications")
      .update({ is_read: true })
      .eq("id", currentBestieNotification.id);

    setShowBestieCreatedCode(false);
    setCurrentBestieNotification(null);
  };

  // Close feature prompt (for when user takes action)
  const closeFeaturePrompt = () => {
    setShowFeaturePrompt(false);
  };

  // Refresh the check (called after user creates a picture password)
  const refreshCheck = useCallback(async () => {
    const shouldShowPrompt = await checkFeaturePrompt();
    setShowFeaturePrompt(shouldShowPrompt);
  }, [checkFeaturePrompt]);

  return {
    loading,
    showFeaturePrompt,
    showBestieCreatedCode,
    currentBestieNotification,
    linkedBesties,
    isGuardian,
    isBestie,
    userHasPicturePassword,
    dismissMaybeLater,
    dismissDontShowAgain,
    markBestieNotificationRead,
    closeFeaturePrompt,
    refreshCheck
  };
}
