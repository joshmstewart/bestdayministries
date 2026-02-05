import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation schema for receipt request - flexible to accept just sponsorshipId
const receiptRequestSchema = z.object({
  sponsorshipId: z.string().uuid().optional(),
  sponsorEmail: z.string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .optional(),
  sponsorName: z.string()
    .max(100, "Name too long")
    .optional(),
  bestieName: z.string()
    .min(1, "Bestie name is required")
    .max(100, "Bestie name too long")
    .optional(),
  amount: z.number()
    .positive("Amount must be positive")
    .max(1000000, "Amount too large")
    .optional(),
  frequency: z.enum(['monthly', 'one-time'], {
    errorMap: () => ({ message: "Frequency must be 'monthly' or 'one-time'" })
  }).optional(),
  transactionId: z.string()
    .min(1, "Transaction ID is required")
    .max(255, "Transaction ID too long")
    .optional(),
  transactionDate: z.string()
    .min(1, "Transaction date is required")
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format"
    })
    .optional(),
  stripeMode: z.enum(['test', 'live'], {
    errorMap: () => ({ message: "Stripe mode must be 'test' or 'live'" })
  }).optional().default('live'),
});

interface ReceiptRequest {
  sponsorshipId?: string;
  sponsorEmail: string;
  sponsorName?: string;
  bestieName: string;
  amount: number;
  frequency: string;
  transactionId: string;
  transactionDate: string;
  stripeMode?: 'test' | 'live';
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

    const requestData = await req.json();
    
    // Validate request data
    const validationResult = receiptRequestSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error('Invalid receipt request:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    let {
      sponsorshipId,
      sponsorEmail,
      sponsorName,
      bestieName,
      amount,
      frequency,
      transactionId,
      transactionDate,
      stripeMode = 'live'
    } = validationResult.data;

    // If only sponsorshipId provided, fetch all other details from database
    if (sponsorshipId && !sponsorEmail) {
      console.log('[AUDIT] Fetching sponsorship details for ID:', sponsorshipId);
      
      const { data: sponsorshipData, error: sponsorshipError } = await supabaseAdmin
        .from('sponsorships')
        .select(`
          *,
          sponsor_besties (
            bestie_name
          ),
          profiles!sponsorships_sponsor_id_fkey (
            email,
            display_name
          )
        `)
        .eq('id', sponsorshipId)
        .single();

      if (sponsorshipError || !sponsorshipData) {
        console.error('[AUDIT] Failed to fetch sponsorship:', sponsorshipError);
        throw new Error('Sponsorship not found');
      }

      // Extract data from the joined query
      sponsorEmail = (sponsorshipData as any).profiles?.email;
      sponsorName = (sponsorshipData as any).profiles?.display_name;
      bestieName = (sponsorshipData as any).sponsor_besties?.bestie_name;
      amount = sponsorshipData.amount;
      frequency = sponsorshipData.frequency;
      transactionId = sponsorshipData.stripe_subscription_id || sponsorshipData.id;
      transactionDate = new Date().toISOString();
      stripeMode = sponsorshipData.stripe_mode || 'live';

      console.log('[AUDIT] Successfully fetched sponsorship details');
    }

    // Validate that we have all required fields
    if (!sponsorEmail || !bestieName || !amount || !frequency || !transactionId || !transactionDate) {
      throw new Error('Missing required sponsorship data');
    }

    console.log('[AUDIT] Receipt generation starting for:', sponsorEmail);
    
    // Log receipt generation start
    if (sponsorshipId) {
      await supabaseAdmin.from('receipt_generation_logs').insert({
        sponsorship_id: sponsorshipId,
        stage: 'receipt_generation_start',
        status: 'success',
        metadata: { sponsor_email: sponsorEmail, amount, frequency }
      });
    }

    // Fetch receipt settings
    console.log('[AUDIT] Fetching receipt settings');
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('receipt_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error('[AUDIT] Failed to fetch settings:', settingsError);
      if (sponsorshipId) {
        await supabaseAdmin.from('receipt_generation_logs').insert({
          sponsorship_id: sponsorshipId,
          stage: 'settings_fetch',
          status: 'failure',
          error_message: settingsError?.message || 'Settings not found'
        });
      }
      throw new Error('Receipt settings not configured');
    }

    console.log('[AUDIT] Settings fetched successfully');
    if (sponsorshipId) {
      await supabaseAdmin.from('receipt_generation_logs').insert({
        sponsorship_id: sponsorshipId,
        stage: 'settings_fetch',
        status: 'success'
      });
    }

    // Fetch logo URL from app settings
    const { data: logoSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'logo_url')
      .maybeSingle();

    // Determine if this is a sponsorship (has sponsorshipId) or donation
    const isSponsorship = !!sponsorshipId;
    const receiptType = isSponsorship ? 'Sponsorship' : 'Donation';
    
    // Select the appropriate message and tax notice based on type
    const receiptMessage = isSponsorship 
      ? (settings.sponsorship_receipt_message || settings.receipt_message || '')
      : (settings.donation_receipt_message || settings.receipt_message || '');
    
    const taxNotice = isSponsorship
      ? (settings.sponsorship_tax_deductible_notice || settings.tax_deductible_notice || '')
      : (settings.donation_tax_deductible_notice || settings.tax_deductible_notice || '');

    // Parse the JSON-stringified value
    let logoUrl: string | null = null;
    if (logoSetting?.setting_value) {
      try {
        logoUrl = typeof logoSetting.setting_value === 'string' 
          ? JSON.parse(logoSetting.setting_value)
          : logoSetting.setting_value;
      } catch {
        logoUrl = logoSetting.setting_value as string;
      }
    }

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

    // This function ONLY sends emails - calling functions handle receipt record creation
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
                      <img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 200px; height: auto; margin-bottom: 20px; border-radius: 12px;" />
                    ` : ''}
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${settings.organization_name}
                    </h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">
                       ${receiptType} Receipt
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
                       ${receiptMessage}
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
                             ${receiptType} Details
                           </h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                           <table role="presentation" style="width: 100%;">
                             ${isSponsorship ? `
                             <tr>
                               <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">Bestie Sponsored:</td>
                               <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${bestieName}</td>
                             </tr>
                             ` : ''}
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
                         ${taxNotice}
                       </p>
                      ${settings.organization_ein ? `
                        <p style="margin: 10px 0 0; font-size: 14px; color: #78350F;">
                          <strong>Tax ID:</strong> ${settings.organization_ein}
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
                          ${logoUrl ? `
                            <img src="${logoUrl}" alt="${settings.organization_name}" style="max-width: 150px; height: auto; margin-bottom: 12px; border-radius: 8px;" />
                          ` : ''}
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

    console.log('[AUDIT] Sending email to:', sponsorEmail);
    const emailResponse = await resend.emails.send({
      from: settings.from_email,
      to: [sponsorEmail],
      replyTo: settings.reply_to_email || undefined,
      subject: `Sponsorship Receipt - ${bestieName} - ${formattedAmount}`,
      html: emailHtml,
    });

    console.log('[AUDIT] Email sent successfully:', emailResponse.data?.id);
    
    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    if (sponsorshipId) {
      await supabaseAdmin.from('receipt_generation_logs').insert({
        sponsorship_id: sponsorshipId,
        stage: 'email_send',
        status: 'success',
        metadata: { email_id: emailResponse.data?.id, recipient: sponsorEmail }
      });
    }

    // Log to universal email audit trail
    try {
      await supabaseAdmin.from('email_audit_log').insert({
        resend_email_id: emailResponse.data?.id,
        email_type: 'receipt',
        recipient_email: sponsorEmail,
        recipient_name: sponsorName || null,
        from_email: settings.from_email,
        from_name: settings.organization_name,
        subject: `Sponsorship Receipt - ${bestieName} - ${formattedAmount}`,
        html_content: emailHtml,
        status: 'sent',
        related_id: sponsorshipId,
        related_type: 'sponsorship',
        sent_at: new Date().toISOString(),
        metadata: { 
          receipt_number: receiptNumber,
          stripe_mode: stripeMode,
          transaction_id: transactionId,
          amount: amount,
          frequency: frequency,
          bestie_name: bestieName
        }
      });
    } catch (logError) {
      console.error('[email-audit] Failed to log email send:', logError);
      // Don't fail the request if logging fails
    }

    // Email sent successfully - calling function handles receipt record creation
    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      receiptNumber 
    }), {
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
