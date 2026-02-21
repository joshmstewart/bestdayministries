import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SENDERS, SITE_URL, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const resend = new Resend(resendApiKey);

    const { type, pledge_id } = await req.json();

    if (!pledge_id) throw new Error('pledge_id is required');
    if (!type || !['confirmation', 'receipt'].includes(type)) {
      throw new Error('type must be "confirmation" or "receipt"');
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get pledge with event details
    const { data: pledge, error: pledgeError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('*, bike_ride_events(*)')
      .eq('id', pledge_id)
      .single();

    if (pledgeError || !pledge) {
      throw new Error('Pledge not found');
    }

    const event = pledge.bike_ride_events;
    const rideDate = new Date(event.ride_date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/Denver',
    });

    let subject: string;
    let htmlContent: string;

    if (type === 'confirmation') {
      const maxTotal = (pledge.cents_per_mile / 100) * Number(event.mile_goal);
      subject = `Your pledge for "${event.title}" is confirmed! 🚴`;
      htmlContent = buildConfirmationEmail({
        pledgerName: pledge.pledger_name,
        eventTitle: event.title,
        riderName: event.rider_name,
        rideDate,
        centsPerMile: pledge.cents_per_mile,
        mileGoal: Number(event.mile_goal),
        maxTotal,
        message: pledge.message,
      });
    } else {
      // Receipt email after charge
      const actualMiles = Number(event.actual_miles);
      const totalCharged = pledge.calculated_total || (pledge.cents_per_mile / 100) * actualMiles;
      subject = `Receipt: Your bike ride pledge charge of $${totalCharged.toFixed(2)} 🧾`;
      htmlContent = buildReceiptEmail({
        pledgerName: pledge.pledger_name,
        eventTitle: event.title,
        riderName: event.rider_name,
        rideDate,
        centsPerMile: pledge.cents_per_mile,
        actualMiles,
        totalCharged,
        chargeStatus: pledge.charge_status,
      });
    }

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: SENDERS.noreply,
      to: [pledge.pledger_email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`Bike pledge ${type} email sent to ${pledge.pledger_email}, resend_id: ${emailData?.id}`);

    return new Response(
      JSON.stringify({ success: true, email_id: emailData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-bike-pledge-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── Email Templates ───

interface ConfirmationData {
  pledgerName: string;
  eventTitle: string;
  riderName: string;
  rideDate: string;
  centsPerMile: number;
  mileGoal: number;
  maxTotal: number;
  message?: string | null;
}

function buildConfirmationEmail(d: ConfirmationData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#c2410c,#ea580c);padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;">🚴 Pledge Confirmed!</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#44403c;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Hi <strong>${d.pledgerName}</strong>,
          </p>
          <p style="color:#44403c;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Thank you for pledging to support <strong>${d.riderName}</strong>'s bike ride! Your generosity makes a real difference.
          </p>
          <!-- Details Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:8px;padding:20px;margin:0 0 24px;">
            <tr><td>
              <p style="margin:0 0 8px;color:#92400e;font-weight:bold;font-size:14px;">PLEDGE DETAILS</p>
              <p style="margin:4px 0;color:#78350f;font-size:15px;">📋 <strong>Event:</strong> ${d.eventTitle}</p>
              <p style="margin:4px 0;color:#78350f;font-size:15px;">📅 <strong>Ride Date:</strong> ${d.rideDate}</p>
              <p style="margin:4px 0;color:#78350f;font-size:15px;">💰 <strong>Your Pledge:</strong> ${d.centsPerMile}¢ per mile</p>
              <p style="margin:4px 0;color:#78350f;font-size:15px;">🎯 <strong>Mile Goal:</strong> ${d.mileGoal} miles</p>
              <p style="margin:4px 0;color:#78350f;font-size:15px;">📊 <strong>Maximum Charge:</strong> $${d.maxTotal.toFixed(2)}</p>
            </td></tr>
          </table>
          ${d.message ? `<p style="color:#44403c;font-size:14px;line-height:1.6;margin:0 0 24px;padding:12px;background:#f5f5f4;border-left:3px solid #ea580c;border-radius:4px;"><em>"${d.message}"</em></p>` : ''}
          <p style="color:#44403c;font-size:15px;line-height:1.6;margin:0 0 8px;">
            <strong>How it works:</strong>
          </p>
          <ul style="color:#57534e;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
            <li>Your card has been securely saved — no charge yet.</li>
            <li>After the ride, you'll be charged based on actual miles completed.</li>
            <li>You'll receive a receipt email with the final amount.</li>
          </ul>
          <p style="color:#78716c;font-size:13px;line-height:1.5;margin:0;">
            If you have any questions, please reach out to us at <a href="mailto:contact@bestdayministries.org" style="color:#ea580c;">contact@bestdayministries.org</a>.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px;background:#fafaf9;text-align:center;border-top:1px solid #e7e5e4;">
          <p style="margin:0;color:#a8a29e;font-size:12px;">${ORGANIZATION_NAME} · <a href="${SITE_URL}" style="color:#ea580c;">${SITE_URL.replace('https://', '')}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface ReceiptData {
  pledgerName: string;
  eventTitle: string;
  riderName: string;
  rideDate: string;
  centsPerMile: number;
  actualMiles: number;
  totalCharged: number;
  chargeStatus: string;
}

function buildReceiptEmail(d: ReceiptData): string {
  const isSuccess = d.chargeStatus === 'charged';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#15803d,#22c55e);padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;">🧾 Pledge ${isSuccess ? 'Receipt' : 'Update'}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#44403c;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Hi <strong>${d.pledgerName}</strong>,
          </p>
          <p style="color:#44403c;font-size:16px;line-height:1.6;margin:0 0 24px;">
            ${isSuccess
              ? `The bike ride is complete! <strong>${d.riderName}</strong> rode <strong>${d.actualMiles} miles</strong>, and your card has been charged. Thank you for your incredible support!`
              : `We have an update regarding your pledge for <strong>${d.riderName}</strong>'s ride.`
            }
          </p>
          <!-- Receipt Card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${isSuccess ? '#dcfce7' : '#fef9c3'};border-radius:8px;padding:20px;margin:0 0 24px;">
            <tr><td>
              <p style="margin:0 0 8px;color:${isSuccess ? '#166534' : '#854d0e'};font-weight:bold;font-size:14px;">${isSuccess ? 'CHARGE RECEIPT' : 'PLEDGE STATUS'}</p>
              <p style="margin:4px 0;color:${isSuccess ? '#14532d' : '#713f12'};font-size:15px;">📋 <strong>Event:</strong> ${d.eventTitle}</p>
              <p style="margin:4px 0;color:${isSuccess ? '#14532d' : '#713f12'};font-size:15px;">📅 <strong>Ride Date:</strong> ${d.rideDate}</p>
              <p style="margin:4px 0;color:${isSuccess ? '#14532d' : '#713f12'};font-size:15px;">🚴 <strong>Miles Completed:</strong> ${d.actualMiles}</p>
              <p style="margin:4px 0;color:${isSuccess ? '#14532d' : '#713f12'};font-size:15px;">💰 <strong>Rate:</strong> ${d.centsPerMile}¢ per mile</p>
              <hr style="border:none;border-top:1px solid ${isSuccess ? '#86efac' : '#fde68a'};margin:12px 0;">
              <p style="margin:4px 0;color:${isSuccess ? '#14532d' : '#713f12'};font-size:18px;font-weight:bold;">
                ${isSuccess ? '✅' : '⚠️'} <strong>Total ${isSuccess ? 'Charged' : 'Amount'}:</strong> $${d.totalCharged.toFixed(2)}
              </p>
              ${!isSuccess ? `<p style="margin:8px 0 0;color:#92400e;font-size:13px;">Status: ${d.chargeStatus}. Please contact us if you have questions.</p>` : ''}
            </td></tr>
          </table>
          ${isSuccess ? `
          <p style="color:#44403c;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your donation is tax-deductible. Please keep this email for your records.
          </p>` : ''}
          <p style="color:#78716c;font-size:13px;line-height:1.5;margin:0;">
            Questions? Contact us at <a href="mailto:contact@bestdayministries.org" style="color:#ea580c;">contact@bestdayministries.org</a>.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px;background:#fafaf9;text-align:center;border-top:1px solid #e7e5e4;">
          <p style="margin:0;color:#a8a29e;font-size:12px;">${ORGANIZATION_NAME} · <a href="${SITE_URL}" style="color:#ea580c;">${SITE_URL.replace('https://', '')}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
