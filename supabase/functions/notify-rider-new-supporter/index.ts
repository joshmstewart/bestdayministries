import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SENDERS, SITE_URL } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pledge_id } = await req.json();
    if (!pledge_id) throw new Error("pledge_id is required");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(resendApiKey);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: pledge, error: pErr } = await supabase
      .from("bike_ride_pledges")
      .select("*, bike_ride_events(*)")
      .eq("id", pledge_id)
      .single();

    if (pErr || !pledge) throw new Error("Pledge not found");

    const event = pledge.bike_ride_events;
    if (!event?.created_by) {
      console.log("No rider user_id on event; skipping notification");
      return new Response(JSON.stringify({ skipped: true, reason: "no_rider" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: riderProfile } = await supabase
      .from("profiles")
      .select("email, first_name, display_name")
      .eq("id", event.created_by)
      .single();

    if (!riderProfile?.email) {
      console.log("Rider has no email; skipping");
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute amount summary
    let amountLine = "";
    if (pledge.pledge_type === "per_mile" && pledge.cents_per_mile) {
      const perMile = (pledge.cents_per_mile / 100).toFixed(2);
      const maxTotal = ((pledge.cents_per_mile / 100) * Number(event.mile_goal || 0)).toFixed(2);
      amountLine = `<strong>$${perMile}/mile</strong> (up to $${maxTotal} for ${event.mile_goal} miles)`;
    } else if (pledge.flat_amount) {
      amountLine = `<strong>$${Number(pledge.flat_amount).toFixed(2)}</strong>`;
    } else if (pledge.calculated_total) {
      amountLine = `<strong>$${Number(pledge.calculated_total).toFixed(2)}</strong>`;
    }

    const riderName = riderProfile.first_name || riderProfile.display_name || "there";
    const eventUrl = event.slug
      ? `${SITE_URL}/bike-rides/${event.slug}`
      : `${SITE_URL}/bike-rides`;

    const subject = `🎉 New supporter for ${event.title}!`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h1 style="color: #f97316; margin-bottom: 8px;">You've got a new supporter! 🚴</h1>
        <p style="font-size: 16px;">Hi ${riderName},</p>
        <p style="font-size: 16px;">
          Great news — <strong>${pledge.pledger_name || pledge.pledger_email || "Someone"}</strong>
          just pledged support for <strong>${event.title}</strong>.
        </p>
        ${amountLine ? `<p style="font-size: 16px;">Pledge: ${amountLine}</p>` : ""}
        ${pledge.message ? `<blockquote style="border-left: 4px solid #f97316; padding: 8px 16px; margin: 16px 0; background: #fff7ed; font-style: italic;">"${pledge.message}"</blockquote>` : ""}
        <p style="margin-top: 24px;">
          <a href="${eventUrl}" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View your ride page</a>
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
          Keep training — every mile matters. 💪
        </p>
      </div>
    `;

    const result = await resend.emails.send({
      from: SENDERS.notifications,
      to: riderProfile.email,
      subject,
      html,
    });

    console.log("Rider notified:", riderProfile.email, result);

    return new Response(
      JSON.stringify({ success: true, sent_to: riderProfile.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("notify-rider-new-supporter error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
