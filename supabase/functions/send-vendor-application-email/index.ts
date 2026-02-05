import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailDelay } from "../_shared/emailRateLimiter.ts";
import { SITE_URL } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .select("id, email, display_name")
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

    // Check for an active campaign template for vendor_application
    const { data: template } = await supabaseClient
      .from("campaign_templates")
      .select("*")
      .eq("trigger_event", "vendor_application")
      .eq("is_active", true)
      .eq("auto_send", true)
      .single();

    // Get organization settings for email branding
    const { data: orgData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_organization")
      .single();

    // Get header and footer if template exists
    const { data: headerData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_header")
      .single();

    const { data: footerData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_footer")
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

    // Build email content - use template if available, otherwise use default
    let subject: string;
    let htmlContent: string;
    const baseUrl = SITE_URL;

    if (template) {
      console.log("Using campaign template for vendor application email");
      
      // Replace placeholders in subject
      subject = template.subject
        .replace(/\[BUSINESS_NAME\]/g, businessName)
        .replace(/\[APPLICANT_EMAIL\]/g, applicantEmail)
        .replace(/\[CATEGORIES\]/g, categoriesDisplay);

      // Build content with header/footer
      htmlContent = "";
      
      if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
        htmlContent += headerData.setting_value.html;
      }
      
      // Replace placeholders in content
      htmlContent += template.content
        .replace(/\[BUSINESS_NAME\]/g, businessName)
        .replace(/\[APPLICANT_EMAIL\]/g, applicantEmail)
        .replace(/\[CATEGORIES\]/g, categoriesDisplay)
        .replace(/\[DESCRIPTION\]/g, businessDescription || "Not provided")
        .replace(/\[ADMIN_LINK\]/g, `${baseUrl}/admin?tab=vendors`);
      
      if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
        htmlContent += footerData.setting_value.html;
      }
    } else {
      console.log("No template found, using default vendor application email");
      
      subject = `🏪 New Vendor Application: ${businessName}`;
      htmlContent = `
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
              <a href="${baseUrl}/admin?tab=vendors" 
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
    }

    // Send email to each admin
    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
    console.log(`Sending vendor application notification to ${adminEmails.length} admin(s)`);

    let sentCount = 0;
    for (let i = 0; i < adminProfiles.length; i++) {
      const admin = adminProfiles[i];
      if (!admin.email) continue;
      
      // Rate limit: wait before sending (except first email)
      if (sentCount > 0) await emailDelay();
      
      try {
        const { data: emailData, error: sendError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: admin.email,
          subject: subject,
          html: htmlContent,
        });

        if (sendError) {
          console.error(`Failed to send to ${admin.email}:`, sendError);
          
          // Log failed send
          if (template) {
            await supabaseClient.from("automated_campaign_sends").insert({
              template_id: template.id,
              trigger_event: "vendor_application",
              recipient_email: admin.email,
              recipient_user_id: admin.id,
              status: "failed",
              error_message: sendError.message || String(sendError),
              trigger_data: { businessName, applicantEmail, productCategories },
            });
          }
        } else {
          sentCount++;
          console.log(`Successfully sent notification to ${admin.email}`);
          
          // Log successful send
          if (template) {
            await supabaseClient.from("automated_campaign_sends").insert({
              template_id: template.id,
              trigger_event: "vendor_application",
              recipient_email: admin.email,
              recipient_user_id: admin.id,
              status: "sent",
              sent_at: new Date().toISOString(),
              trigger_data: { businessName, applicantEmail, productCategories },
            });
          }
        }
      } catch (emailError: any) {
        console.error(`Error sending to ${admin.email}:`, emailError);
      }
    }

    // Log the notification to audit log
    await supabaseClient.from("email_audit_log").insert({
      email_type: "vendor_application_notification",
      from_email: fromEmail,
      from_name: fromName,
      recipient_email: adminEmails.join(", "),
      subject: subject,
      status: sentCount > 0 ? "sent" : "failed",
      related_type: "vendor",
      related_id: vendorId,
      metadata: {
        business_name: businessName,
        applicant_email: applicantEmail,
        admins_notified: sentCount,
        used_template: !!template,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notified ${sentCount} admin(s)`,
        sentCount,
        usedTemplate: !!template,
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
