import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ResendWebhookPayload = await req.json();
    console.log("Resend webhook received:", payload.type);

    // Only handle email.sent events for tracking ambassador outbound emails
    if (payload.type !== "email.sent") {
      return new Response(JSON.stringify({ message: "Event type not handled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email_id, from, to, subject } = payload.data;

    // Check if this is from an ambassador email address
    const { data: ambassador } = await supabase
      .from("ambassador_profiles")
      .select("id, ambassador_email, personal_email")
      .eq("ambassador_email", from)
      .eq("is_active", true)
      .single();

    if (!ambassador) {
      console.log("Email not from ambassador:", from);
      return new Response(JSON.stringify({ message: "Not an ambassador email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique thread key for reply-to address
    const threadKey = crypto.randomUUID().split('-')[0]; // First segment of UUID
    const recipientEmail = to[0];

    // Create email thread
    const { data: thread, error: threadError } = await supabase
      .from("ambassador_email_threads")
      .insert({
        ambassador_id: ambassador.id,
        thread_key: threadKey,
        recipient_email: recipientEmail,
        subject: subject,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (threadError) {
      console.error("Error creating thread:", threadError);
      throw threadError;
    }

    // Log the outbound message
    await supabase.from("ambassador_email_messages").insert({
      thread_id: thread.id,
      direction: "outbound",
      sender_email: from,
      recipient_email: recipientEmail,
      subject: subject,
      message_content: "Email sent via SMTP",
      resend_email_id: email_id,
    });

    console.log(`Thread created for ambassador ${ambassador.id}: reply-${threadKey}@bestdayministries.org`);

    return new Response(
      JSON.stringify({
        success: true,
        thread_key: threadKey,
        reply_address: `reply-${threadKey}@bestdayministries.org`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
