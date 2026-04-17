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
  mode: "preview" | "test";
  recipients?: string[];
  contact_name?: string;
  email?: string;
  ticket_items?: TicketLine[];
  total_amount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) =>
      ["admin", "owner"].includes(r.role),
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();

    const ticket_items: TicketLine[] = body.ticket_items?.length
      ? body.ticket_items
      : [
          { label: "General Admission (13+)", quantity: 2, unit_price: 60 },
          { label: "Kids (6–12)", quantity: 1, unit_price: 40 },
        ];
    const total_amount =
      body.total_amount ??
      ticket_items.reduce((s, t) => s + t.unit_price * t.quantity, 0);

    const html = buildNojConfirmationHtml({
      contact_name: body.contact_name || "Sample Guest",
      ticket_items,
      total_amount,
      is_test: body.mode === "test",
    });

    if (body.mode === "preview") {
      return new Response(JSON.stringify({ html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (body.recipients || []).filter(Boolean);
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    const result = await resend.emails.send({
      from: SENDERS.notifications,
      to: recipients,
      subject: "[TEST] Your Night of Joy Tickets — Confirmation",
      html,
    });

    if ((result as any).error) {
      console.error("Resend error:", (result as any).error);
      return new Response(
        JSON.stringify({ error: (result as any).error?.message || "Send failed" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent_to: recipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[preview-noj-confirmation-email] Error:", err);
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
