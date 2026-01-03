import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendorApplicationRequest {
  vendorId: string;
  businessName: string;
  businessDescription: string;
  productCategories: string[];
  applicantEmail: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { vendorId, businessName, businessDescription, productCategories, applicantEmail }: VendorApplicationRequest = await req.json();

    console.log(`Processing vendor application email for: ${businessName} (${vendorId})`);

    // Fetch all admin/owner users to notify
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails from profiles
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("email, display_name")
      .in("id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw new Error("Failed to fetch admin emails");
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization settings for email branding
    const { data: orgData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_organization")
      .single();

    const orgInfo = orgData?.setting_value as any;
    const fromEmail = orgInfo?.from_email || "notifications@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Format product categories
    const categoriesDisplay = productCategories?.length > 0 
      ? productCategories.join(", ") 
      : "Not specified";

    // Build email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏪 New Vendor Application</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; margin-bottom: 20px;">A new vendor has applied to join the Joy House Store marketplace.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #374151;">Application Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Business Name:</td>
                <td style="padding: 8px 0; color: #111827;">${businessName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Applicant Email:</td>
                <td style="padding: 8px 0; color: #111827;">${applicantEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Categories:</td>
                <td style="padding: 8px 0; color: #111827;">${categoriesDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500; vertical-align: top;">Description:</td>
                <td style="padding: 8px 0; color: #111827;">${businessDescription || "Not provided"}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/admin?tab=vendors" 
               style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Review Application
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 25px; text-align: center;">
            This is an automated notification from the Joy House Store vendor system.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email to each admin
    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
    console.log(`Sending vendor application notification to ${adminEmails.length} admin(s)`);

    let sentCount = 0;
    for (const adminEmail of adminEmails) {
      try {
        const { error: sendError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: adminEmail,
          subject: `🏪 New Vendor Application: ${businessName}`,
          html: htmlContent,
        });

        if (sendError) {
          console.error(`Failed to send to ${adminEmail}:`, sendError);
        } else {
          sentCount++;
          console.log(`Successfully sent notification to ${adminEmail}`);
        }
      } catch (emailError) {
        console.error(`Error sending to ${adminEmail}:`, emailError);
      }
    }

    // Log the notification
    await supabaseClient.from("email_audit_log").insert({
      email_type: "vendor_application_notification",
      from_email: fromEmail,
      from_name: fromName,
      recipient_email: adminEmails.join(", "),
      subject: `New Vendor Application: ${businessName}`,
      status: sentCount > 0 ? "sent" : "failed",
      related_type: "vendor",
      related_id: vendorId,
      metadata: {
        business_name: businessName,
        applicant_email: applicantEmail,
        admins_notified: sentCount,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${sentCount} admin(s)`,
        sentCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-vendor-application-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
