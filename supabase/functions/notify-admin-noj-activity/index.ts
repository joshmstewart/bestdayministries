import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { SITE_URL, SENDERS, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyRequest {
  type: 'ticket_purchase' | 'sponsorship_inquiry';
  email: string;
  contact_name?: string;
  // ticket_purchase fields
  tier_summary?: string;
  total_amount?: number;
  is_free?: boolean;
  // sponsorship_inquiry fields
  business_name?: string;
  selected_tier?: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body: NotifyRequest = await req.json();
    const { type, email, contact_name } = body;

    console.log(`[notify-admin-noj-activity] Processing ${type} notification for ${email}`);

    // Get all admin/owner user IDs
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found to notify");
      return new Response(JSON.stringify({ success: true, message: "No admins to notify" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build notification content based on type
    let notifTitle = "";
    let notifMessage = "";
    let emailSubject = "";
    let emailBody = "";

    if (type === 'ticket_purchase') {
      const { tier_summary, total_amount, is_free } = body;
      const displayName = contact_name || email;
      const amountText = is_free ? 'Free' : `$${(total_amount || 0).toFixed(2)}`;

      notifTitle = "🎟️ Night of Joy Ticket Purchase";
      notifMessage = `${displayName} purchased tickets (${tier_summary}) — ${amountText}`;
      emailSubject = `🎟️ New Night of Joy Ticket Purchase — ${displayName}`;
      emailBody = `
        <h2>New Ticket Purchase!</h2>
        <p><strong>${displayName}</strong> just purchased Night of Joy tickets.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${email}</td></tr>
          ${contact_name ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name:</td><td>${contact_name}</td></tr>` : ''}
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Tickets:</td><td>${tier_summary}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Amount:</td><td>${amountText}</td></tr>
        </table>
      `;
    } else if (type === 'sponsorship_inquiry') {
      const { business_name, selected_tier, phone } = body;
      const displayName = contact_name || email;

      notifTitle = "💼 Night of Joy Sponsorship Inquiry";
      notifMessage = `${displayName}${business_name ? ` (${business_name})` : ''} submitted a sponsorship inquiry — ${selected_tier || 'General'}`;
      emailSubject = `💼 New Night of Joy Sponsorship Inquiry — ${displayName}`;
      emailBody = `
        <h2>New Sponsorship Inquiry!</h2>
        <p><strong>${displayName}</strong> submitted a Night of Joy sponsorship inquiry.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${email}</td></tr>
          ${contact_name ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name:</td><td>${contact_name}</td></tr>` : ''}
          ${business_name ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Business:</td><td>${business_name}</td></tr>` : ''}
          ${selected_tier ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Tier:</td><td>${selected_tier}</td></tr>` : ''}
          ${phone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone:</td><td>${phone}</td></tr>` : ''}
        </table>
        <p><a href="${SITE_URL}/admin?tab=contact" style="display:inline-block;padding:10px 20px;background:#FF6B35;color:white;text-decoration:none;border-radius:6px;">View in Admin</a></p>
      `;
    }

    // 1. Create in-app notifications for all admins
    const notifications = adminRoles.map(({ user_id }) => ({
      user_id,
      type: 'event' as const,
      title: notifTitle,
      message: notifMessage,
      link: type === 'ticket_purchase' ? '/admin?tab=events' : '/admin?tab=contact',
      metadata: { noj_activity_type: type, email, contact_name },
    }));

    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Failed to create in-app notifications:", notifError);
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }

    // 2. Send email to all admins
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const resend = new Resend(resendKey);

      // Get admin emails
      const adminIds = adminRoles.map(r => r.user_id);
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", adminIds);

      const adminEmails = (adminProfiles || [])
        .map(p => p.email)
        .filter(Boolean) as string[];

      if (adminEmails.length > 0) {
        // Get logo
        const { data: logoSetting } = await supabaseAdmin
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "logo_url")
          .single();
        const logoUrl = logoSetting?.setting_value || "";

        const html = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#333;margin:0;padding:0;">
              <div style="max-width:600px;margin:0 auto;padding:20px;">
                ${logoUrl ? `<div style="text-align:center;padding:20px 0;border-bottom:2px solid #f0f0f0;"><img src="${logoUrl}" alt="Logo" style="max-width:200px;height:auto;border-radius:12px;" /></div>` : ''}
                <div style="padding:30px 0;">
                  ${emailBody}
                </div>
                <div style="text-align:center;padding:20px 0;border-top:2px solid #f0f0f0;color:#666;font-size:14px;">
                  <p>${ORGANIZATION_NAME} — A Night of Joy</p>
                </div>
              </div>
            </body>
          </html>
        `;

        try {
          await resend.emails.send({
            from: SENDERS.notifications,
            to: adminEmails,
            subject: emailSubject,
            html,
          });
          console.log(`Email sent to ${adminEmails.length} admins`);
        } catch (emailErr) {
          console.error("Failed to send admin email:", emailErr);
        }
      }
    } else {
      console.log("RESEND_API_KEY not set, skipping email notification");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[notify-admin-noj-activity] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
