import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTestRequest {
  campaignId: string;
  testEmail: string;
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

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: adminCheck } = await supabaseClient
      .rpc("has_admin_access", { _user_id: user.id });

    if (!adminCheck) {
      throw new Error("Admin access required");
    }

    const { campaignId, testEmail }: SendTestRequest = await req.json();

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Fetch header and footer settings
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

    const { data: orgData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_organization")
      .single();

    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add campaign content
    htmlContent += campaign.html_content;
    
    // Add footer if enabled
    if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
      htmlContent += footerData.setting_value.html;
    }

    // Get organization info
    const orgInfo = orgData?.setting_value as any;
    const orgName = orgInfo?.name || "Best Day Ministries";
    const orgAddress = orgInfo?.address || "Your Address Here";
    const fromEmail = orgInfo?.from_email || "newsletter@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    // Add test notice and unsubscribe footer
    htmlContent = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; border-radius: 4px; color: #856404;">
        <strong>⚠️ TEST EMAIL</strong> - This is a test version of your newsletter. Links and tracking are not functional in test mode.
      </div>
    ` + htmlContent;

    htmlContent += `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="#" style="color: #666;">Unsubscribe</a></p>
        <p>${orgName}<br/>${orgAddress.replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    // Send via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: htmlContent,
    });

    if (sendError) {
      console.error("Failed to send test email:", sendError);
      throw sendError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Test email sent to ${testEmail}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-test-newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});