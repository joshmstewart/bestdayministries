import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailDelay } from "../_shared/emailRateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get prayers expiring within the next 3 days that haven't been notified
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: expiringPrayers, error: fetchError } = await supabase
      .from("prayer_requests")
      .select(`
        id,
        title,
        user_id,
        share_duration,
        expires_at
      `)
      .eq("is_public", true)
      .eq("expiry_notified", false)
      .lte("expires_at", threeDaysFromNow.toISOString())
      .gt("expires_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching expiring prayers:", fetchError);
      throw fetchError;
    }

    if (!expiringPrayers || expiringPrayers.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring prayers to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${expiringPrayers.length} expiring prayers to notify`);

    // Get user profiles for email
    const userIds = [...new Set(expiringPrayers.map(p => p.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    }
    
    // Get notification preferences for all users
    const { data: allPreferences, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id, inapp_on_prayer_expiring, email_on_prayer_expiring")
      .in("user_id", userIds);
    
    if (prefsError) {
      console.error("Error fetching notification preferences:", prefsError);
    }
    
    const prefsMap = new Map(allPreferences?.map(p => [p.user_id, p]) || []);

    // Get auth users for emails
    const authEmails = new Map<string, string>();
    for (const userId of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        authEmails.set(userId, userData.user.email);
      }
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const results = [];
    let emailsSent = 0;

    for (const prayer of expiringPrayers) {
      try {
        const userPrefs = prefsMap.get(prayer.user_id);
        const shouldSendInApp = userPrefs?.inapp_on_prayer_expiring !== false;
        const shouldSendEmail = userPrefs?.email_on_prayer_expiring !== false;
        
        const daysUntilExpiry = Math.ceil(
          (new Date(prayer.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Create in-app notification only if preference allows
        if (shouldSendInApp) {
          await supabase.from("notifications").insert({
            user_id: prayer.user_id,
            type: "prayer_expiring",
            title: "Prayer Request Expiring Soon",
            message: `Your prayer "${prayer.title}" will be unshared in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Renew it to keep it visible to the community.`,
            target_id: prayer.id,
            target_type: "prayer_request",
          });
        }

        // Send email notification if Resend is configured and preference allows
        const userEmail = authEmails.get(prayer.user_id);
        if (resendApiKey && userEmail && shouldSendEmail) {
          // Rate limit: wait before sending (except first email)
          if (emailsSent > 0) await emailDelay();
          
          const profile = profileMap.get(prayer.user_id);
          const userName = profile?.display_name || "Friend";

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Joy House <notifications@bestdayministries.org>",
              to: [userEmail],
              subject: `Your Prayer Request "${prayer.title}" is Expiring Soon`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #c87533;">🙏 Prayer Request Expiring</h2>
                  <p>Hi ${userName},</p>
                  <p>Your prayer request "<strong>${prayer.title}</strong>" will be removed from the community board in <strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong>.</p>
                  <p>If you'd like to keep it visible so others can continue praying with you, please renew it.</p>
                  <p style="margin-top: 20px;">
                    <a href="https://bestdayministries.lovable.app/prayer-requests" 
                       style="background-color: #c87533; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                      Renew Your Prayer
                    </a>
                  </p>
                  <p style="margin-top: 30px; color: #666;">
                    With love,<br>
                    The Joy House Family
                  </p>
                </div>
              `,
            }),
          });
          emailsSent++;
        }

        // Mark as notified
        await supabase
          .from("prayer_requests")
          .update({ expiry_notified: true })
          .eq("id", prayer.id);

        results.push({ prayerId: prayer.id, status: "notified", inApp: shouldSendInApp, email: shouldSendEmail });
      } catch (notifyError) {
        console.error(`Error notifying for prayer ${prayer.id}:`, notifyError);
        results.push({ prayerId: prayer.id, status: "error", error: String(notifyError) });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${results.length} expiration notifications`,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in prayer-expiry-notifications:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
