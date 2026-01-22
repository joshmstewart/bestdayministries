import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentNotificationRequest {
  submissionId: string;
  assignedToUserId: string;
  assignedByUserId: string;
  submissionSubject?: string;
  senderName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { submissionId, assignedToUserId, assignedByUserId, submissionSubject, senderName }: AssignmentNotificationRequest = await req.json();

    // Don't notify if assigning to self
    if (assignedToUserId === assignedByUserId) {
      return new Response(JSON.stringify({ success: true, skipped: "self-assignment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get assignee info
    const { data: assigneeProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", assignedToUserId)
      .single();

    if (!assigneeProfile?.email) {
      throw new Error("Could not find assignee email");
    }

    // Get assigner info
    const { data: assignerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", assignedByUserId)
      .single();

    const assignerName = assignerProfile?.display_name || "An admin";

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: assignedToUserId,
      type: "contact_form_assignment",
      title: "Message assigned to you",
      message: `${assignerName} assigned you a message from ${senderName}${submissionSubject ? `: "${submissionSubject}"` : ""}`,
      link: "/admin?tab=contact",
      metadata: {
        submission_id: submissionId,
        assigned_by: assignedByUserId,
      },
    });

    // Send email notification if Resend is configured
    if (resendApiKey) {
      // Get app logo
      const { data: logoSetting } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "logo_url")
        .single();

      let logoUrl = "https://bestdayministries.lovable.app/lovable-uploads/30b14d94-fb5c-4e56-a960-ef0f6614a498.png";
      if (logoSetting?.setting_value) {
        const val = typeof logoSetting.setting_value === 'string' 
          ? logoSetting.setting_value.replace(/^"|"$/g, '') 
          : (logoSetting.setting_value as { url?: string }).url || logoUrl;
        if (val && val.startsWith('http')) {
          logoUrl = val;
        }
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f5f0; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%); padding: 40px 30px; text-align: center;">
                      <img src="${logoUrl}" alt="Logo" style="height: 60px; margin-bottom: 20px; border-radius: 12px;" />
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Message Assigned to You</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi ${assigneeProfile.display_name || "there"},
                      </p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        <strong>${assignerName}</strong> has assigned you a message to handle:
                      </p>
                      
                      <div style="background-color: #f8f5f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="color: #374151; font-size: 14px; margin: 0 0 8px;"><strong>From:</strong> ${senderName}</p>
                        ${submissionSubject ? `<p style="color: #374151; font-size: 14px; margin: 0;"><strong>Subject:</strong> ${submissionSubject}</p>` : ''}
                      </div>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://bestdayministries.lovable.app/admin?tab=contact" 
                           style="display: inline-block; background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Message
                        </a>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f5f0; padding: 20px 30px; text-align: center;">
                      <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        This is an automated notification from Best Day Ministries.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Best Day Ministries <noreply@bestdayministries.org>",
          to: [assigneeProfile.email],
          subject: `Message assigned to you from ${senderName}`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        console.error("Failed to send assignment email:", await emailRes.text());
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending assignment notification:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
