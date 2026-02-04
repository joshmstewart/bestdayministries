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

      // Use count queries to avoid hitting the 1000-row default limit
      const [subscribersCountResult, profilesCountResult] = await Promise.all([
        supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("*", { count: "exact", head: true })
      ]);

      if (subscribersCountResult.error) throw subscribersCountResult.error;
      if (profilesCountResult.error) throw profilesCountResult.error;

      const activeSubscriberCount = subscribersCountResult.count || 0;
      const allProfilesCount = profilesCountResult.count || 0;

      // For non_subscribers and roles calculations, we need actual data
      // Fetch with pagination to get all records
      let allSubscribers: { id: string; user_id: string | null; email: string }[] = [];
      let allProfiles: { id: string; email: string }[] = [];
      
      // Check if any campaign needs detailed data (non_subscribers or roles)
      const needsDetailedData = campaigns.some(c => {
        const ta = c.target_audience || { type: "all" };
        return ta.type === "non_subscribers" || ta.type === "roles";
      });

      if (needsDetailedData) {
        // Fetch all subscribers with pagination
        let subscriberPage = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("newsletter_subscribers")
            .select("id, user_id, email")
            .eq("status", "active")
            .range(subscriberPage * pageSize, (subscriberPage + 1) * pageSize - 1);
          
          if (error) throw error;
          if (!data || data.length === 0) break;
          allSubscribers = [...allSubscribers, ...data];
          if (data.length < pageSize) break;
          subscriberPage++;
        }

        // Fetch all profiles with pagination
        let profilePage = 0;
        while (true) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email")
            .range(profilePage * pageSize, (profilePage + 1) * pageSize - 1);
          
          if (error) throw error;
          if (!data || data.length === 0) break;
          allProfiles = [...allProfiles, ...data];
          if (data.length < pageSize) break;
          profilePage++;
        }
      }

      // Pre-compute non-subscribers count
      const subscribedUserIds = new Set(allSubscribers.map(s => s.user_id).filter(Boolean));
      const subscribedEmails = new Set(allSubscribers.map(s => s.email).filter(Boolean));
      const nonSubscribersCount = allProfiles.filter(
        p => !subscribedUserIds.has(p.id) && !subscribedEmails.has(p.email)
      ).length;

      // Get all subscriber user_ids for role queries
      const subscriberUserIds = allSubscribers.map(s => s.user_id).filter(Boolean) as string[];

      // Fetch roles for all subscribers at once (with pagination if needed)
      let userRolesMap: Record<string, string[]> = {};
      if (subscriberUserIds.length > 0) {
        let allRoles: { user_id: string; role: string }[] = [];
        // Supabase IN clause can handle many IDs, but we'll batch if needed
        const batchSize = 500;
        for (let i = 0; i < subscriberUserIds.length; i += batchSize) {
          const batch = subscriberUserIds.slice(i, i + batchSize);
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", batch);
          if (roles) allRoles = [...allRoles, ...roles];
        }

        allRoles.forEach(r => {
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
