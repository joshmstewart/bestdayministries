import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  sponsorEmail: string;
  sponsorName?: string;
  bestieName: string;
  amount: number;
  frequency: string;
  transactionId: string;
  transactionDate: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      sponsorEmail,
      sponsorName,
      bestieName,
      amount,
      frequency,
      transactionId,
      transactionDate
    }: ReceiptRequest = await req.json();

    console.log('Sending receipt to:', sponsorEmail, 'for bestie:', bestieName);

    // Fetch receipt settings
    const { data: settings } = await supabaseAdmin
      .from('receipt_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!settings) {
      throw new Error('Receipt settings not configured');
    }

    // Fetch logo URL from app settings
    const { data: logoSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'logo_url')
      .maybeSingle();

    const logoUrl = logoSetting?.setting_value as string | null;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    const formattedDate = new Date(transactionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const frequencyText = frequency === 'monthly' ? 'Monthly Recurring' : 'One-Time';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sponsorship Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-radius: 8px 8px 0 0;">
                    ${logoUrl ? `
                      <img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
                    ` : ''}
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${settings.organization_name}
                    </h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">
                      Sponsorship Receipt
                    </p>
                  </td>
                </tr>

                <!-- Thank You Message -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      ${sponsorName ? `Dear ${sponsorName},` : 'Dear Sponsor,'}
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      ${settings.receipt_message}
                    </p>
                  </td>
                </tr>

                <!-- Sponsorship Details -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <table role="presentation" style="width: 100%; border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td style="padding: 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
                          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                            Sponsorship Details
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Bestie Sponsored:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${bestieName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Amount:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedAmount}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Frequency:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${frequencyText}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Date:</td>
                              <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${formattedDate}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Transaction ID:</td>
                              <td style="padding: 8px 0; font-size: 12px; font-weight: 600; color: #111827; text-align: right; word-break: break-all;">${transactionId}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Tax Information -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <div style="padding: 20px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px;">
                      <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #92400E;">
                        Tax-Deductible Donation
                      </h3>
                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78350F;">
                        ${settings.tax_deductible_notice}
                      </p>
                      ${settings.tax_id ? `
                        <p style="margin: 10px 0 0; font-size: 14px; color: #78350F;">
                          <strong>Tax ID:</strong> ${settings.tax_id}
                        </p>
                      ` : ''}
                    </div>
                  </td>
                </tr>

                <!-- Organization Info -->
                <tr>
                  <td style="padding: 20px 40px 40px; border-top: 1px solid #E5E7EB;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">
                            ${settings.organization_name}
                          </p>
                          ${settings.organization_address ? `
                            <p style="margin: 0 0 8px; font-size: 13px; color: #6B7280;">
                              ${settings.organization_address}
                            </p>
                          ` : ''}
                          ${settings.website_url ? `
                            <p style="margin: 0; font-size: 13px;">
                              <a href="${settings.website_url}" style="color: #D97706; text-decoration: none;">
                                ${settings.website_url.replace('https://', '').replace('http://', '')}
                              </a>
                            </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #6B7280;">
                      Please keep this receipt for your tax records.
                    </p>
                    ${frequency === 'monthly' ? `
                      <p style="margin: 10px 0 0; font-size: 12px; color: #6B7280;">
                        You will receive a receipt each time your monthly sponsorship is processed.
                      </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: settings.from_email,
      to: [sponsorEmail],
      replyTo: settings.reply_to_email || undefined,
      subject: `Sponsorship Receipt - ${bestieName} - ${formattedAmount}`,
      html: emailHtml,
    });

    console.log('Receipt sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-sponsorship-receipt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
