// Shared builder for the "A Night of Joy" ticket confirmation email.
// Used by both the admin preview function and the live send function so
// the design stays in lock-step.

import { ORGANIZATION_NAME, SITE_URL } from "./domainConstants.ts";

export interface TicketLine {
  label: string;
  quantity: number;
  unit_price: number;
}

export const NOJ_SPONSOR_LOGOS = [
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

export const NOJ_EVENT = {
  address: "10652 County Rd 15, Firestone, CO 80504",
  venue: "Truitt Homestead",
  dateLong: "Saturday, June 14, 2026",
  timeRange: "4:00 PM – 7:00 PM MST",
};

export const NOJ_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${NOJ_EVENT.venue}, ${NOJ_EVENT.address}`,
)}`;

export function buildNojConfirmationHtml(opts: {
  contact_name?: string;
  ticket_items: TicketLine[];
  total_amount: number;
  is_test?: boolean;
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

  const sponsorLogosHtml = NOJ_SPONSOR_LOGOS.map(
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
              <div style="margin-top:14px;color:#fde9c5;font-size:15px;">${NOJ_EVENT.dateLong} · ${NOJ_EVENT.timeRange}</div>
              <div style="color:#fde9c5;font-size:14px;">${NOJ_EVENT.venue}</div>
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
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">📅 Date:</strong> ${NOJ_EVENT.dateLong}</td></tr>
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">🕓 Time:</strong> ${NOJ_EVENT.timeRange}</td></tr>
                <tr><td style="padding:4px 0;"><strong style="color:#f4e4c1;">📍 Venue:</strong> ${NOJ_EVENT.venue}</td></tr>
                <tr><td style="padding:4px 0 4px 22px;"><a href="${NOJ_MAPS_URL}" target="_blank" style="color:#b8860b;text-decoration:underline;">${NOJ_EVENT.address}</a></td></tr>
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
