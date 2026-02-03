import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRequest {
  trigger_event: string;
  recipient_email: string;
  recipient_user_id?: string;
  trigger_data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Automated campaign send triggered");
    
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { trigger_event, recipient_email, recipient_user_id, trigger_data = {} }: CampaignRequest = await req.json();

    console.log(`📧 Finding template for event: ${trigger_event}`);

    // Check for duplicate sends within last 24 hours to prevent spam
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSend } = await supabaseClient
      .from("automated_campaign_sends")
      .select("id, created_at")
      .eq("recipient_email", recipient_email)
      .eq("trigger_event", trigger_event)
      .eq("status", "sent")
      .gte("created_at", twentyFourHoursAgo)
      .maybeSingle();

    if (recentSend) {
      console.log(`⏭️ Skipping duplicate send - same email (${recipient_email}) and trigger (${trigger_event}) was sent at ${recentSend.created_at}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Skipped - duplicate email within 24 hours",
          skipped: true,
          previous_send_at: recentSend.created_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Find active template for this trigger event
    const { data: template, error: templateError } = await supabaseClient
      .from("campaign_templates")
      .select("*")
      .eq("trigger_event", trigger_event)
      .eq("is_active", true)
      .eq("auto_send", true)
      .maybeSingle();

    if (templateError) {
      console.error("Template query error:", templateError);
      throw templateError;
    }

    if (!template) {
      console.log(`⚠️ No active template found for event: ${trigger_event}`);
      return new Response(
        JSON.stringify({ success: false, message: "No template found for this event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`✅ Found template: ${template.name}`);

    // Check if delay is needed
    if (template.delay_minutes > 0) {
      console.log(`⏱️ Delaying send by ${template.delay_minutes} minutes`);
      // In production, you'd use a job queue. For now, we'll send immediately
      // and log that a delay was requested
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

    // Replace placeholders in subject and content
    let subject = template.subject;
    let content = template.content;

    // Helper to escape regex special characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const mergeInlineStyle = (tag: string, styleToAdd: string): string => {
      if (/style\s*=\s*"/i.test(tag)) {
        return tag.replace(/style\s*=\s*"([^"]*)"/i, (_m, existing) => {
          const trimmed = String(existing ?? "").trim();
          const needsSemicolon = trimmed.length > 0 && !trimmed.endsWith(";");
          const sep = trimmed.length === 0 ? "" : needsSemicolon ? "; " : " ";
          return `style="${trimmed}${sep}${styleToAdd}"`;
        });
      }
      return tag.replace(/\/?>(?=\s*$)/, (end) => ` style="${styleToAdd}"${end}`);
    };

    const styleStandardTablesOnly = (html: string): string => {
      return (html || "").replace(
        /<table\b(?![^>]*data-two-column)[\s\S]*?<\/table>/gi,
        (tableHtml) => {
          let updated = tableHtml.replace(
            /<table\b(?![^>]*data-two-column)[^>]*>/i,
            (tableTag) =>
              mergeInlineStyle(
                tableTag,
                "width:100%;border-collapse:collapse;table-layout:auto;"
              )
          );

          updated = updated.replace(/<th\b[^>]*>/gi, (thTag) =>
            mergeInlineStyle(
              thTag,
              "padding:10px 12px;vertical-align:top;text-align:left;font-weight:700;"
            )
          );
          updated = updated.replace(/<td\b[^>]*>/gi, (tdTag) =>
            mergeInlineStyle(
              tdTag,
              "padding:10px 12px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;"
            )
          );

          return updated;
        }
      );
    };

    const styleFooterImages = (html: string): string => {
      return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
        mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
      );
    };

    // Replace common placeholders
    Object.keys(trigger_data).forEach((key) => {
      const placeholder = `[${key.toUpperCase()}]`;
      const escapedPlaceholder = escapeRegex(placeholder);
      const value = trigger_data[key] || '';
      subject = subject.replace(new RegExp(escapedPlaceholder, 'g'), value);
      content = content.replace(new RegExp(escapedPlaceholder, 'g'), value);
    });

    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add campaign content (apply email-safe formatting to standard tables)
    htmlContent += styleStandardTablesOnly(content);
    
    // Add footer if enabled
    if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
      htmlContent += styleFooterImages(footerData.setting_value.html);
    }

    // Get organization info
    const orgInfo = orgData?.setting_value as any;
    const fromEmail = orgInfo?.from_email || "noreply@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    console.log(`📤 Sending email to: ${recipient_email}`);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("❌ Email send error:", emailError);
      
      // Log failed send to automated_campaign_sends
      await supabaseClient.from("automated_campaign_sends").insert({
        template_id: template.id,
        recipient_email,
        recipient_user_id: recipient_user_id || null,
        trigger_event,
        trigger_data,
        status: "failed",
        error_message: emailError.message,
      });

      // Also log to newsletter_emails_log for comprehensive tracking
      await supabaseClient.from("newsletter_emails_log").insert({
        template_id: template.id,
        recipient_email,
        recipient_user_id: recipient_user_id || null,
        subject: subject,
        html_content: htmlContent,
        status: "failed",
        error_message: emailError.message,
        metadata: { 
          trigger_event, 
          trigger_data,
          template_name: template.name 
        },
      });

      throw emailError;
    }

    console.log("✅ Email sent successfully:", emailData);

    // Log successful send to automated_campaign_sends
    await supabaseClient.from("automated_campaign_sends").insert({
      template_id: template.id,
      recipient_email,
      recipient_user_id: recipient_user_id || null,
      trigger_event,
      trigger_data,
      status: "sent",
    });

    // Also log to newsletter_emails_log for comprehensive tracking
    await supabaseClient.from("newsletter_emails_log").insert({
      template_id: template.id,
      recipient_email,
      recipient_user_id: recipient_user_id || null,
      subject: subject,
      html_content: htmlContent,
      status: "sent",
      resend_email_id: emailData?.id,
      metadata: { 
        trigger_event, 
        trigger_data,
        template_name: template.name 
      },
    });

    return new Response(
      JSON.stringify({ success: true, template_used: template.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Error in send-automated-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
