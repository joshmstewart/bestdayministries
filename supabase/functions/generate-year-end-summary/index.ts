import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YearEndRequest {
  taxYear?: number;
  sendEmail?: boolean;
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

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user?.email) throw new Error("User not authenticated");

    const { taxYear, sendEmail }: YearEndRequest = await req.json().catch(() => ({}));
    const year = taxYear || new Date().getFullYear() - 1; // Default to previous year

    console.log('Generating year-end summary for:', user.email, 'Year:', year);

    // Get transactions from the combined donation_stripe_transactions table (matches DonationHistory display)
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('donation_stripe_transactions')
      .select('*')
      .eq('email', user.email)
      .eq('stripe_mode', 'live') // Year-end summaries should always use live mode
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: true });

    if (txError) throw txError;

    // Build summary from transactions
    let summaryData: any = null;
    if (transactions && transactions.length > 0) {
      const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const donations = transactions.map(t => ({
        date: t.transaction_date,
        bestie_name: t.designation || 'General Donation',
        amount: t.amount,
        receipt_number: t.stripe_invoice_id || t.stripe_charge_id || t.id.substring(0, 20).toUpperCase()
      }));
      
      // Get user profile for name
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      summaryData = {
        sponsor_email: user.email,
        sponsor_name: profile?.full_name || user.email.split('@')[0],
        tax_year: year,
        total_amount: totalAmount,
        total_donations: transactions.length,
        donations
      };
    }
    
    // If no summary found and not sending email, create mock data for preview
    if (!summaryData && !sendEmail) {
      // Generate mock data for preview
      summaryData = {
        sponsor_email: user.email,
        sponsor_name: 'John Sponsor',
        tax_year: year,
        total_amount: 300.00,
        total_donations: 12,
        donations: [
          { date: `${year}-01-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-001' },
          { date: `${year}-02-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-002' },
          { date: `${year}-03-15`, bestie_name: 'Sample Bestie 2', amount: 25.00, receipt_number: 'RCPT-003' },
          { date: `${year}-04-15`, bestie_name: 'Sample Bestie 2', amount: 25.00, receipt_number: 'RCPT-004' },
          { date: `${year}-05-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-005' },
          { date: `${year}-06-15`, bestie_name: 'Sample Bestie 3', amount: 25.00, receipt_number: 'RCPT-006' },
          { date: `${year}-07-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-007' },
          { date: `${year}-08-15`, bestie_name: 'Sample Bestie 2', amount: 25.00, receipt_number: 'RCPT-008' },
          { date: `${year}-09-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-009' },
          { date: `${year}-10-15`, bestie_name: 'Sample Bestie 3', amount: 25.00, receipt_number: 'RCPT-010' },
          { date: `${year}-11-15`, bestie_name: 'Sample Bestie 1', amount: 25.00, receipt_number: 'RCPT-011' },
          { date: `${year}-12-15`, bestie_name: 'Sample Bestie 2', amount: 25.00, receipt_number: 'RCPT-012' },
        ]
      };
    } else if (!summaryData && sendEmail) {
      // If trying to send actual email but no data, return error
      return new Response(JSON.stringify({ 
        error: 'No donations found for this year',
        year 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch year-end summary settings
    const { data: yearEndSettings } = await supabaseAdmin
      .from('year_end_summary_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!yearEndSettings) {
      throw new Error('Year-end summary settings not configured');
    }

    // Fetch receipt settings for organization info
    const { data: receiptSettings } = await supabaseAdmin
      .from('receipt_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!receiptSettings) {
      throw new Error('Receipt settings not configured');
    }

    // Fetch logo URL
    const { data: logoSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'logo_url')
      .maybeSingle();

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

    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(summaryData.total_amount);

    // Generate detailed donations table
    const donationsTable = summaryData.donations.map((donation: any) => {
      const date = new Date(donation.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(donation.amount);
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151;">${date}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #374151;">${donation.bestie_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${amount}</td>
          <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; text-align: right;">${donation.receipt_number}</td>
        </tr>
      `;
    }).join('');

    const emailSubject = yearEndSettings.email_subject.replace('{year}', year.toString());
    const emailIntro = yearEndSettings.email_intro_text.replace('{year}', year.toString());
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${year} Year-End Tax Summary</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-radius: 8px 8px 0 0;">
                    ${logoUrl ? `
                      <img src="${logoUrl}" alt="${receiptSettings.organization_name}" style="max-width: 200px; height: auto; margin-bottom: 20px; border-radius: 12px;" />
                    ` : ''}
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${year} Year-End Tax Summary
                    </h1>
                    <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px;">
                      ${receiptSettings.organization_name}
                    </p>
                  </td>
                </tr>

                <!-- Summary -->
                <tr>
                  <td style="padding: 30px 40px;">
                     <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                       Dear ${summaryData.sponsor_name || 'Generous Donor'},
                     </p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      ${emailIntro}
                    </p>
                    
                    <!-- Total Box -->
                    <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; border: 2px solid #F59E0B;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #92400E; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                        Total ${year} Donations
                      </p>
                      <p style="margin: 0; font-size: 42px; font-weight: bold; color: #78350F;">
                        ${formattedTotal}
                      </p>
                       <p style="margin: 8px 0 0; font-size: 14px; color: #92400E;">
                         ${summaryData.total_donations} donation${summaryData.total_donations > 1 ? 's' : ''}
                       </p>
                    </div>
                  </td>
                </tr>

                <!-- Donations Table -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">
                      Donation Details
                    </h2>
                    <table role="presentation" style="width: 100%; border: 2px solid #E5E7EB; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #F9FAFB;">
                          <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">Date</th>
                          <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">Bestie</th>
                          <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">Amount</th>
                          <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">Receipt #</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${donationsTable}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Tax Information -->
                <tr>
                  <td style="padding: 0 40px 30px;">
                    <div style="padding: 20px; background-color: #FEF3C7; border-left: 4px solid #D97706; border-radius: 4px;">
                      <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #92400E;">
                        Tax Deduction Information
                      </h3>
                      <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #78350F;">
                        ${yearEndSettings.tax_notice_text}
                      </p>
                      ${receiptSettings.tax_id ? `
                        <p style="margin: 10px 0 0; font-size: 14px; color: #78350F;">
                          <strong>Tax ID (EIN):</strong> ${receiptSettings.tax_id}
                        </p>
                      ` : ''}
                      <p style="margin: 10px 0 0; font-size: 13px; color: #92400E; font-style: italic;">
                        No goods or services were provided in exchange for these donations.
                      </p>
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
                            <img src="${logoUrl}" alt="${receiptSettings.organization_name}" style="max-width: 150px; height: auto; margin-bottom: 12px; border-radius: 8px;" />
                          ` : ''}
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">
                            ${receiptSettings.organization_name}
                          </p>
                          ${receiptSettings.organization_address ? `
                            <p style="margin: 0 0 8px; font-size: 13px; color: #6B7280;">
                              ${receiptSettings.organization_address}
                            </p>
                          ` : ''}
                          ${receiptSettings.website_url ? `
                            <p style="margin: 0; font-size: 13px;">
                              <a href="${receiptSettings.website_url}" style="color: #D97706; text-decoration: none;">
                                ${receiptSettings.website_url.replace('https://', '').replace('http://', '')}
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
                      Please retain this summary for your tax records.
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #6B7280;">
                      If you have any questions, please contact us.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email if requested
    let resendEmailId: string | null = null;
    if (sendEmail) {
      const emailResponse = await resend.emails.send({
        from: receiptSettings.from_email,
        to: [user.email],
        replyTo: receiptSettings.reply_to_email || undefined,
        subject: emailSubject,
        html: emailHtml,
      });
      
      resendEmailId = emailResponse.data?.id || null;
      console.log('Year-end summary email sent to:', user.email, 'Email ID:', resendEmailId);

      // Log to universal email audit trail
      try {
        await supabaseAdmin.from('email_audit_log').insert({
          resend_email_id: resendEmailId,
          email_type: 'year_end_summary',
          recipient_email: user.email,
          recipient_user_id: user.id,
          recipient_name: summaryData.sponsor_name,
          from_email: receiptSettings.from_email,
          from_name: receiptSettings.organization_name,
          subject: emailSubject,
          html_content: emailHtml,
          status: 'sent',
          related_type: 'tax_summary',
          sent_at: new Date().toISOString(),
          metadata: { tax_year: year, total_amount: summaryData.total_amount, total_donations: summaryData.total_donations }
        });
      } catch (logError) {
        console.error('[email-audit] Failed to log email send:', logError);
        // Don't fail the request if logging fails
      }

      // Log sent email to database (only if real data)
      if (transactions && transactions.length > 0) {
        await supabaseAdmin
          .from('year_end_summary_sent')
          .insert({
            user_id: user.id,
            user_email: user.email,
            user_name: summaryData.sponsor_name,
            tax_year: year,
            total_amount: summaryData.total_amount,
            resend_email_id: resendEmailId,
            status: 'sent',
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      summary: summaryData,
      html: emailHtml,
      emailSent: sendEmail || false,
      resendEmailId,
      isMockData: !transactions || transactions.length === 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-year-end-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});