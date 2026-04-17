import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { SENDERS, ORGANIZATION_NAME, SITE_URL } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TicketLine {
  label: string;
  quantity: number;
  unit_price: number;
}

interface RequestBody {
  mode: "preview" | "test";
  // Test-send: array of recipient emails
  recipients?: string[];
  // Sample data overrides (otherwise sensible defaults are used)
  contact_name?: string;
  email?: string;
  ticket_items?: TicketLine[];
  total_amount?: number;
}

const SPONSOR_LOGOS = [
  {
    name: "Phil Long Ford",
    url: "https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/noj/sponsor-phil-long-ford.png",
    caption: "Phil Long Ford",
    link: "https://www.phillongford.com",
  },
  {
    name: "General Air",
    url: "https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/noj/sponsor-general-air.png",
    caption: "General Air",
    link: "https://www.generalair.com",
  },
];

const EVENT_ADDRESS = "10652 County Rd 15, Firestone, CO 80504";
const EVENT_VENUE = "Truitt Homestead";
const EVENT_DATE_LONG = "Saturday, June 14, 2026";
const EVENT_TIME_RANGE = "4:00 PM – 7:00 PM MST";
const EVENT_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${EVENT_VENUE}, ${EVENT_ADDRESS}`)}`;

function buildEmailHtml(opts: {
  contact_name?: string;
  ticket_items: TicketLine[];
  total_amount: number;
  is_test: boolean;
}): string {
  const { contact_name, ticket_items, total_amount, is_test } = opts;
  const greetingName = contact_name?.trim() || "Friend";

  const ticketRows = ticket_items
    .filter((t) => t.quantity > 0)
    .map(
      (t) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #3a2a1c;color:#f4e4c1;">
            ${t.quantity}× ${t.label}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #3a2a1c;text-align:right;color:#f4e4c1;">
            ${t.unit_price === 0 ? "Free" : `$${(t.unit_price * t.quantity).toFixed(2)}`}
          </td>
        </tr>`,
    )
    .join("");

  const sponsorLogosHtml = SPONSOR_LOGOS.map(
    (s) => `
      <td align="center" valign="middle" style="padding:14px 18px;">
        <a href="${s.link}" target="_blank" style="text-decoration:none;color:#5b2e0a;">
          <img src="${s.url}" alt="${s.name}" style="max-height:60px;max-width:180px;height:auto;width:auto;display:block;border:0;" />
          ${s.caption ? `<div style="margin-top:6px;font-size:12px;color:#5b2e0a;font-family:Arial,sans-serif;text-decoration:underline;">${s.caption}</div>` : ""}
        </a>
      </td>`,
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Night of Joy Tickets</title>
</head>
<body style="margin:0;padding:0;background:#1a1108;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  ${
    is_test
      ? `<div style="background:#fff3cd;color:#7a5a00;padding:10px;text-align:center;font-size:13px;font-weight:bold;">⚠️ This is a TEST preview. Not a real ticket confirmation.</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1108;">
    <tr>
      <td align="center" style="padding:30px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#231811;border-radius:12px;overflow:hidden;border:1px solid #3a2a1c;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5b2e0a 0%,#8b4513 50%,#b8860b 100%);padding:40px 30px;text-align:center;">
              <div style="font-size:13px;letter-spacing:3px;color:#f4e4c1;text-transform:uppercase;font-weight:600;margin-bottom:8px;">A Night of Joy</div>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;color:#fff;letter-spacing:1px;">You're Confirmed!</h1>
              <div style="margin-top:14px;color:#fde9c5;font-size:15px;">${EVENT_DATE_LONG} · ${EVENT_TIME_RANGE}</div>
              <div style="color:#fde9c5;font-size:14px;">${EVENT_VENUE}</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 30px 8px;">
              <p style="margin:0 0 14px;color:#f4e4c1;font-size:16px;line-height:1.6;">
                Hi ${greetingName},
              </p>
              <p style="margin:0;color:#d4b896;font-size:15px;line-height:1.6;">
                Thank you for joining us at <strong style="color:#f4e4c1;">A Night of Joy</strong> — an unforgettable evening of dinner, live entertainment, and a silent auction supporting adults with special abilities.
              </p>
            </td>
          </tr>

          <!-- Ticket summary -->
          <tr>
            <td style="padding:24px 30px;">
              <div style="background:#1a1108;border:1px solid #3a2a1c;border-radius:8px;padding:20px;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8860b;font-weight:bold;margin-bottom:14px;">Your Order</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${ticketRows || `<tr><td style="color:#8b7355;font-style:italic;">No tickets selected.</td></tr>`}
                  <tr>
                    <td style="padding:14px 0 0;font-weight:bold;color:#f4e4c1;font-size:16px;">Total</td>
                    <td style="padding:14px 0 0;text-align:right;font-weight:bold;color:#fff;font-size:18px;">
                      ${total_amount === 0 ? "Free" : `$${total_amount.toFixed(2)}`}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding:8px 30px 24px;">
              <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8860b;font-weight:bold;margin-bottom:12px;">Event Details</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="color:#d4b896;font-size:14px;line-height:1.7;">
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">📅 Date:</strong> ${EVENT_DATE_LONG}</td></tr>
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">🕓 Time:</strong> ${EVENT_TIME_RANGE}</td></tr>
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">📍 Venue:</strong> ${EVENT_VENUE}</td></tr>
                <tr><td style="padding:4px 0 4px 22px;"><a href="${EVENT_MAPS_URL}" target="_blank" style="color:#b8860b;text-decoration:underline;">${EVENT_ADDRESS}</a></td></tr>
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">🎟️ Check-in:</strong> Bring this confirmation — no printed ticket required</td></tr>
              </table>
            </td>
          </tr>

          <!-- Sponsors -->
          <tr>
            <td style="padding:24px 30px 10px;border-top:1px solid #3a2a1c;">
              <div style="text-align:center;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8860b;font-weight:bold;margin-bottom:18px;">
                Thank You to Our Sponsors
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;">
                <tr>${sponsorLogosHtml}</tr>
              </table>
              <p style="margin:18px 0 0;text-align:center;color:#8b7355;font-size:13px;line-height:1.5;">
                This event is made possible by the generosity of our sponsors.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 30px 30px;text-align:center;">
              <a href="${SITE_URL}/night-of-joy" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#8b4513);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">
                View Event Page
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#140c06;padding:24px 30px;text-align:center;color:#8b7355;font-size:12px;line-height:1.6;border-top:1px solid #3a2a1c;">
              <div style="color:#d4b896;font-weight:bold;margin-bottom:6px;">${ORGANIZATION_NAME}</div>
              <div>Questions? Reply to this email or visit <a href="${SITE_URL}" style="color:#b8860b;text-decoration:none;">${ORGANIZATION_NAME.toLowerCase().replace(/ /g, "")}.org</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only admin/owner can preview or send tests
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

    const html = buildEmailHtml({
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

    // Test send
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
