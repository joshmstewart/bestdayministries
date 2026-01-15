import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BATCH-YEAR-END] ${step}${detailsStr}`);
};

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

    if (!settings.auto_send_enabled) {
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

    // Check if we should run based on auto_send settings
    const body = await req.json().catch(() => ({}));
    const forceRun = body.force === true;

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

    // Get all donors who gave in the tax year (from sponsorship_receipts)
    const { data: donorSummaries, error: summaryError } = await supabase
      .from("sponsorship_receipts")
      .select("user_id, sponsor_email, amount, organization_name, organization_ein")
      .eq("tax_year", taxYear)
      .not("sent_at", "is", null);

    if (summaryError) {
      logStep("Error fetching donor summaries", summaryError);
      throw summaryError;
    }

    if (!donorSummaries || donorSummaries.length === 0) {
      logStep("No donors found for tax year", { taxYear });
      return new Response(JSON.stringify({ message: "No donors to process", taxYear }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate by email
    const donorTotals = new Map<string, { 
      email: string; 
      userId: string | null; 
      totalAmount: number;
      organizationName: string;
      organizationEin: string;
    }>();

    for (const receipt of donorSummaries) {
      const email = receipt.sponsor_email;
      if (!email) continue;

      const existing = donorTotals.get(email);
      if (existing) {
        existing.totalAmount += receipt.amount || 0;
      } else {
        donorTotals.set(email, {
          email,
          userId: receipt.user_id,
          totalAmount: receipt.amount || 0,
          organizationName: receipt.organization_name || receiptSettings?.organization_name || "Best Day Ever Ministries",
          organizationEin: receipt.organization_ein || receiptSettings?.organization_ein || "",
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

    const results = {
      sent: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Send emails to each donor
    for (const [email, donor] of donorTotals) {
      if (alreadySentEmails.has(email)) {
        results.skipped++;
        continue;
      }

      try {
        // Get user name if available
        let userName = "Valued Donor";
        if (donor.userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", donor.userId)
            .single();
          if (profile?.full_name) {
            userName = profile.full_name;
          }
        }

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
                <strong>${donor.organizationName}</strong><br/>
                ${donor.organizationEin ? `EIN: ${donor.organizationEin}<br/>` : ''}
                This letter serves as your official acknowledgment for tax purposes.
                No goods or services were provided in exchange for your contribution.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              Please retain this email for your tax records. If you have any questions about your giving history, 
              please contact us at ${settings.contact_email || 'support@bestdayministries.com'}.
            </p>
            
            <p>With gratitude,<br/><strong>${donor.organizationName}</strong></p>
          </div>
        `;

        const emailResult = await resend.emails.send({
          from: `${donor.organizationName} <${settings.contact_email || 'noreply@bestdayministries.com'}>`,
          to: [email],
          subject: settings.email_subject || `Your ${taxYear} Year-End Giving Summary`,
          html: emailHtml,
        });

        // Log the sent summary
        await supabase.from("year_end_summary_sent").insert({
          user_id: donor.userId,
          user_email: email,
          user_name: userName,
          tax_year: taxYear,
          total_amount: donor.totalAmount,
          status: "sent",
          resend_email_id: emailResult.data?.id,
        });

        results.sent++;
        logStep("Sent summary", { email, amount: donor.totalAmount });

      } catch (emailError: any) {
        results.errors.push(`${email}: ${emailError.message}`);
        logStep("Error sending to donor", { email, error: emailError.message });
      }
    }

    logStep("Batch complete", results);

    return new Response(JSON.stringify({
      success: true,
      taxYear,
      ...results,
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
