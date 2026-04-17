// Sends the branded "A Night of Joy" ticket confirmation email to a real
// purchaser. Called server-to-server (service role) from the ticket
// checkout flow — both the free-ticket path (immediately) and the paid
// path (after Stripe success, via the success page or reconciliation).
//
// Idempotency: callers should pass an idempotency_key (e.g. the donations
// row id or stripe session id). If a row already exists in
// noj_confirmation_email_log with that key, we skip resending.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { SENDERS } from "../_shared/domainConstants.ts";
import {
  buildNojConfirmationHtml,
  type TicketLine,
} from "../_shared/nojConfirmationEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  contact_name?: string;
  ticket_items: TicketLine[];
  total_amount: number;
  idempotency_key?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body: RequestBody = await req.json();
    const {
      email,
      contact_name,
      ticket_items,
      total_amount,
      idempotency_key,
    } = body;

    if (!email || !ticket_items?.length) {
      return new Response(
        JSON.stringify({ error: "email and ticket_items are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Idempotency check — avoid double-sending on retries
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from("noj_confirmation_email_log")
        .select("id")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (existing) {
        console.log(
          "[send-noj-confirmation-email] Skipping — already sent",
          { idempotency_key, email },
        );
        return new Response(
          JSON.stringify({ success: true, skipped: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const resend = new Resend(resendKey);

    const html = buildNojConfirmationHtml({
      contact_name,
      ticket_items,
      total_amount,
      is_test: false,
    });

    const result = await resend.emails.send({
      from: SENDERS.notifications,
      to: [email],
      subject: "Your Night of Joy Tickets — Confirmation",
      html,
    });

    if ((result as any).error) {
      console.error("[send-noj-confirmation-email] Resend error:", (result as any).error);
      return new Response(
        JSON.stringify({
          error: (result as any).error?.message || "Send failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resendId = (result as any).data?.id ?? null;

    // Log the send (best-effort — don't fail the request if this errors)
    try {
      await supabaseAdmin.from("noj_confirmation_email_log").insert({
        idempotency_key: idempotency_key || `manual-${Date.now()}-${email}`,
        recipient_email: email,
        contact_name: contact_name || null,
        ticket_items,
        total_amount,
        resend_email_id: resendId,
      });
    } catch (logErr) {
      console.error("[send-noj-confirmation-email] Log insert failed:", logErr);
    }

    console.log("[send-noj-confirmation-email] Sent", {
      email,
      total_amount,
      idempotency_key,
      resendId,
    });

    return new Response(
      JSON.stringify({ success: true, resend_id: resendId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-noj-confirmation-email] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
