import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TargetAudience {
  type: "all" | "all_site_members" | "non_subscribers" | "roles" | "specific_emails";
  roles?: string[];
  emails?: string[];
}

export const useNewsletterRecipientCount = (targetAudience: TargetAudience | null) => {
  return useQuery({
    queryKey: ["newsletter-recipient-count", targetAudience],
    queryFn: async () => {
      if (!targetAudience) return 0;

      if (targetAudience.type === "specific_emails") {
        return targetAudience.emails?.length || 0;
      }

      if (targetAudience.type === "all") {
        // Count active newsletter subscribers
        const { count, error } = await supabase
          .from("newsletter_subscribers")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        
        if (error) throw error;
        return count || 0;
      }

      if (targetAudience.type === "all_site_members") {
        // Count all profiles
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        if (error) throw error;
        return count || 0;
      }

      if (targetAudience.type === "non_subscribers") {
        // Count profiles minus active subscribers
        const [profilesResult, subscribersResult] = await Promise.all([
          supabase.from("profiles").select("id, email"),
          supabase.from("newsletter_subscribers").select("user_id, email").eq("status", "active")
        ]);

        if (profilesResult.error) throw profilesResult.error;
        if (subscribersResult.error) throw subscribersResult.error;

        const subscribedUserIds = new Set(
          (subscribersResult.data || []).map(s => s.user_id).filter(Boolean)
        );
        const subscribedEmails = new Set(
          (subscribersResult.data || []).map(s => s.email).filter(Boolean)
        );

        const nonSubscribers = (profilesResult.data || []).filter(
          profile => !subscribedUserIds.has(profile.id) && !subscribedEmails.has(profile.email)
        );

        return nonSubscribers.length;
      }

      if (targetAudience.type === "roles" && targetAudience.roles?.length) {
        // Count subscribers who have matching roles
        const { data: subscribers, error: subError } = await supabase
          .from("newsletter_subscribers")
          .select("user_id")
          .eq("status", "active")
          .not("user_id", "is", null);

        if (subError) throw subError;

        const userIds = (subscribers || []).map(s => s.user_id).filter(Boolean);
        if (userIds.length === 0) return 0;

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("user_id", userIds)
          .in("role", targetAudience.roles as ("admin" | "bestie" | "caregiver" | "moderator" | "owner" | "supporter" | "vendor")[]);

        if (rolesError) throw rolesError;

        // Count unique users with matching roles
        const uniqueUserIds = new Set((roles || []).map(r => r.user_id));
        return uniqueUserIds.size;
      }

      return 0;
    },
    enabled: !!targetAudience,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Batch hook for multiple campaigns - more efficient for list views
export const useBatchNewsletterRecipientCounts = (campaigns: any[]) => {
  return useQuery({
    queryKey: ["newsletter-recipient-counts-batch", campaigns?.map(c => c.id).join(",")],
    queryFn: async () => {
      if (!campaigns?.length) return {};

      // Pre-fetch common data once
      const [subscribersResult, profilesResult] = await Promise.all([
        supabase.from("newsletter_subscribers").select("id, user_id, email").eq("status", "active"),
        supabase.from("profiles").select("id, email")
      ]);

      if (subscribersResult.error) throw subscribersResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const activeSubscribers = subscribersResult.data || [];
      const allProfiles = profilesResult.data || [];
      const activeSubscriberCount = activeSubscribers.length;
      const allProfilesCount = allProfiles.length;

      // Pre-compute non-subscribers
      const subscribedUserIds = new Set(activeSubscribers.map(s => s.user_id).filter(Boolean));
      const subscribedEmails = new Set(activeSubscribers.map(s => s.email).filter(Boolean));
      const nonSubscribersCount = allProfiles.filter(
        p => !subscribedUserIds.has(p.id) && !subscribedEmails.has(p.email)
      ).length;

      // Get all subscriber user_ids for role queries
      const subscriberUserIds = activeSubscribers.map(s => s.user_id).filter(Boolean);

      // Fetch roles for all subscribers at once
      let userRolesMap: Record<string, string[]> = {};
      if (subscriberUserIds.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", subscriberUserIds);

        (roles || []).forEach(r => {
          if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
          userRolesMap[r.user_id].push(r.role);
        });
      }

      // Calculate counts for each campaign
      const counts: Record<string, number> = {};

      for (const campaign of campaigns) {
        const targetAudience = campaign.target_audience || { type: "all" };

        if (targetAudience.type === "specific_emails") {
          counts[campaign.id] = targetAudience.emails?.length || 0;
        } else if (targetAudience.type === "all") {
          counts[campaign.id] = activeSubscriberCount;
        } else if (targetAudience.type === "all_site_members") {
          counts[campaign.id] = allProfilesCount;
        } else if (targetAudience.type === "non_subscribers") {
          counts[campaign.id] = nonSubscribersCount;
        } else if (targetAudience.type === "roles" && targetAudience.roles?.length) {
          const matchingUsers = new Set<string>();
          for (const userId of subscriberUserIds) {
            const userRoles = userRolesMap[userId] || [];
            if (targetAudience.roles.some((r: string) => userRoles.includes(r))) {
              matchingUsers.add(userId);
            }
          }
          counts[campaign.id] = matchingUsers.size;
        } else {
          counts[campaign.id] = 0;
        }
      }

      return counts;
    },
    enabled: campaigns?.length > 0,
    staleTime: 30000,
  });
};
