import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    // Replace placeholders in subject and content
    let subject = template.subject;
    let content = template.content;

    // Replace common placeholders
    Object.keys(trigger_data).forEach((key) => {
      const placeholder = `[${key.toUpperCase()}]`;
      subject = subject.replace(new RegExp(placeholder, 'g'), trigger_data[key] || '');
      content = content.replace(new RegExp(placeholder, 'g'), trigger_data[key] || '');
    });

    console.log(`📤 Sending email to: ${recipient_email}`);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Best Day Ministries <noreply@bestdayministries.com>",
      to: [recipient_email],
      subject: subject,
      html: content,
    });

    if (emailError) {
      console.error("❌ Email send error:", emailError);
      
      // Log failed send
      await supabaseClient.from("automated_campaign_sends").insert({
        template_id: template.id,
        recipient_email,
        recipient_user_id: recipient_user_id || null,
        trigger_event,
        trigger_data,
        status: "failed",
        error_message: emailError.message,
      });

      throw emailError;
    }

    console.log("✅ Email sent successfully:", emailData);

    // Log successful send
    await supabaseClient.from("automated_campaign_sends").insert({
      template_id: template.id,
      recipient_email,
      recipient_user_id: recipient_user_id || null,
      trigger_event,
      trigger_data,
      status: "sent",
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
