import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { EMAILS, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BATCH-YEAR-END] ${step}${detailsStr}`);
};

// Rate limit delay between emails (600ms = ~1.6 emails/sec, safely under Resend's 2/sec limit)
const RATE_LIMIT_DELAY_MS = 600;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    
    // SAFETY: Dry run mode is ON by default. Must explicitly set dryRun: false to send emails.
    const dryRun = body.dryRun !== false;
    const forceRun = body.force === true;
    
    logStep("Starting batch year-end summaries", { dryRun, forceRun });

    // Get year-end summary settings
    const { data: settings, error: settingsError } = await supabase
      .from("year_end_summary_settings")
      .select("*")
      .single();

    if (settingsError || !settings) {
      logStep("No year-end summary settings found", settingsError);
      return new Response(JSON.stringify({ error: "Settings not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.auto_send_enabled && !forceRun) {
      logStep("Year-end summaries are disabled");
      return new Response(JSON.stringify({ message: "Year-end summaries disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the tax year (previous year)
    const now = new Date();
    const taxYear = now.getFullYear() - 1;
    logStep("Processing tax year", { taxYear });

    // Check if we should run based on auto_send settings (unless forced)
    if (!forceRun && settings.auto_send_enabled) {
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentDay = now.getDate();
      
      if (currentMonth !== settings.auto_send_month || currentDay !== settings.auto_send_day) {
        logStep("Not the scheduled day", { 
          currentMonth, 
          currentDay, 
          scheduledMonth: settings.auto_send_month,
          scheduledDay: settings.auto_send_day 
        });
        return new Response(JSON.stringify({ message: "Not scheduled to run today" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get receipt settings for organization info
    const { data: receiptSettings } = await supabase
      .from("receipt_settings")
      .select("*")
      .single();

    // FIXED: Use donation_stripe_transactions as the source of truth (synced from Stripe)
    // This table has accurate, deduplicated transaction data
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear + 1}-01-01`;
    
    const { data: transactions, error: transactionError } = await supabase
      .from("donation_stripe_transactions")
      .select("email, donor_id, amount")
      .eq("stripe_mode", "live")
      .gte("transaction_date", startDate)
      .lt("transaction_date", endDate);

    if (transactionError) {
      logStep("Error fetching transactions", transactionError);
      throw transactionError;
    }

    if (!transactions || transactions.length === 0) {
      logStep("No transactions found for tax year", { taxYear });
      return new Response(JSON.stringify({ message: "No donors to process", taxYear }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found transactions", { count: transactions.length });

    // Aggregate by email
    const donorTotals = new Map<string, { 
      email: string; 
      donorId: string | null; 
      totalAmount: number;
    }>();

    for (const tx of transactions) {
      const email = tx.email;
      if (!email) continue;

      const existing = donorTotals.get(email);
      if (existing) {
        existing.totalAmount += tx.amount || 0;
      } else {
        donorTotals.set(email, {
          email,
          donorId: tx.donor_id,
          totalAmount: tx.amount || 0,
        });
      }
    }

    logStep("Aggregated donors", { count: donorTotals.size });

    // Check which donors already received summaries for this year
    const { data: alreadySent } = await supabase
      .from("year_end_summary_sent")
      .select("user_email")
      .eq("tax_year", taxYear);

    const alreadySentEmails = new Set(alreadySent?.map(s => s.user_email) || []);
    logStep("Already sent count", { count: alreadySentEmails.size });

    // Build preview data for dry run mode
    const previewData: Array<{
      email: string;
      donorId: string | null;
      totalAmount: number;
      userName: string;
      wouldSkip: boolean;
    }> = [];

    const results = {
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get organization info
    const organizationName = receiptSettings?.organization_name || "Best Day Ministries";
    const organizationEin = receiptSettings?.organization_ein || "";

    // Process each donor
    for (const [email, donor] of donorTotals) {
      const wouldSkip = alreadySentEmails.has(email);
      
      // Get user name if available
      let userName = "Valued Donor";
      if (donor.donorId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", donor.donorId)
          .single();
        if (profile?.full_name) {
          userName = profile.full_name;
        }
      }

      // Add to preview
      previewData.push({
        email,
        donorId: donor.donorId,
        totalAmount: donor.totalAmount,
        userName,
        wouldSkip,
      });

      if (wouldSkip) {
        results.skipped++;
        continue;
      }

      // In dry run mode, don't actually send
      if (dryRun) {
        results.sent++; // Count as would-be-sent
        continue;
      }

      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #B45309; border-bottom: 2px solid #B45309; padding-bottom: 10px;">
              ${taxYear} Year-End Giving Summary
            </h1>
            
            <p>Dear ${userName},</p>
            
            <p>${settings.summary_message || `Thank you for your generous support during ${taxYear}. Your contributions have made a meaningful difference in the lives of adults with intellectual and developmental disabilities.`}</p>
            
            <div style="background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #92400E; margin-top: 0;">Your Total Giving</h2>
              <p style="font-size: 28px; font-weight: bold; color: #B45309; margin: 10px 0;">
                $${donor.totalAmount.toFixed(2)}
              </p>
              <p style="color: #78350F; font-size: 14px;">
                Total tax-deductible contributions for ${taxYear}
              </p>
            </div>
            
            <div style="background: #F3F4F6; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #4B5563;">
                <strong>${organizationName}</strong><br/>
                ${organizationEin ? `EIN: ${organizationEin}<br/>` : ''}
                This letter serves as your official acknowledgment for tax purposes.
                No goods or services were provided in exchange for your contribution.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              Please retain this email for your tax records. If you have any questions about your giving history, 
              please contact us at ${settings.contact_email || EMAILS.support}.
            </p>
            
            <p>With gratitude,<br/><strong>${organizationName}</strong></p>
          </div>
        `;

        const emailResult = await resend.emails.send({
          from: `${organizationName} <${EMAILS.noreply}>`,
          to: [email],
          subject: (settings.email_subject || `Your {year} Tax Summary from ${ORGANIZATION_NAME}`).replace('{year}', String(taxYear)),
          html: emailHtml,
        });

        // Log the sent summary
        await supabase.from("year_end_summary_sent").insert({
          user_id: donor.donorId,
          user_email: email,
          user_name: userName,
          tax_year: taxYear,
          total_amount: donor.totalAmount,
          status: "sent",
          resend_email_id: emailResult.data?.id,
        });

        results.sent++;
        logStep("Sent summary", { email, amount: donor.totalAmount });

        // Rate limiting: wait between emails to avoid hitting Resend's rate limit
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

      } catch (emailError: any) {
        results.errors.push(`${email}: ${emailError.message}`);
        logStep("Error sending to donor", { email, error: emailError.message });
      }
    }

    logStep("Batch complete", { ...results, dryRun });

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      taxYear,
      ...results,
      preview: dryRun ? previewData : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("Fatal error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
