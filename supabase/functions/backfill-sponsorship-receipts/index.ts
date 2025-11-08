import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BACKFILL-RECEIPTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Authentication failed');

    // Verify admin access
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner']);

    if (!roles || roles.length === 0) {
      throw new Error('Unauthorized: Admin access required');
    }

    logStep("Admin authenticated", { userId: user.id });

    // Query ALL sponsorships with no receipts (both test and live modes)
    const { data: sponsorships, error: sponsorshipsError } = await supabaseClient
      .from('sponsorships')
      .select(`
        id,
        sponsor_email,
        sponsor_id,
        bestie_id,
        amount,
        frequency,
        stripe_subscription_id,
        stripe_customer_id,
        stripe_mode,
        sponsor_besties!inner(
          bestie_name
        )
      `)
      .eq('status', 'active');

    if (sponsorshipsError) throw sponsorshipsError;

    logStep("Found sponsorships", { count: sponsorships?.length || 0 });

    // Filter to only those with no receipts
    const sponsorshipsWithReceiptCount = await Promise.all(
      (sponsorships || []).map(async (s) => {
        const { count } = await supabaseClient
          .from('sponsorship_receipts')
          .select('*', { count: 'exact', head: true })
          .eq('sponsorship_id', s.id);
        return { ...s, receiptCount: count || 0 };
      })
    );

    const sponsorshipsNeedingReceipts = sponsorshipsWithReceiptCount.filter(s => s.receiptCount === 0);
    
    logStep("Sponsorships needing receipts", { count: sponsorshipsNeedingReceipts.length });

    if (sponsorshipsNeedingReceipts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No sponsorships need backfilled receipts',
          created: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get receipt settings
    const { data: receiptSettings } = await supabaseClient
      .from('receipt_settings')
      .select('*')
      .single();

    if (!receiptSettings || !receiptSettings.enable_receipts) {
      throw new Error('Receipt generation is not enabled');
    }

    // Group sponsorships by stripe_mode
    const sponsorshipsByMode = sponsorshipsNeedingReceipts.reduce((acc, s) => {
      const mode = s.stripe_mode || 'test';
      if (!acc[mode]) acc[mode] = [];
      acc[mode].push(s);
      return acc;
    }, {} as Record<string, typeof sponsorshipsNeedingReceipts>);

    logStep("Sponsorships grouped by mode", { 
      test: sponsorshipsByMode.test?.length || 0,
      live: sponsorshipsByMode.live?.length || 0
    });

    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[],
      testCreated: 0,
      liveCreated: 0
    };

    // Process each mode separately
    for (const [mode, modeSponsorship] of Object.entries(sponsorshipsByMode)) {
      const stripeKey = mode === 'live' 
        ? Deno.env.get('STRIPE_SECRET_KEY')
        : Deno.env.get('STRIPE_SECRET_KEY_TEST');

      if (!stripeKey) {
        logStep(`Skipping ${mode} mode - no Stripe key configured`);
        continue;
      }

      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
      logStep(`Processing ${mode} mode`, { count: modeSponsorship.length });

      // Process each sponsorship in this mode
      for (const sponsorship of modeSponsorship) {
      try {
        logStep("Processing sponsorship", { 
          id: sponsorship.id, 
          email: sponsorship.sponsor_email,
          subscriptionId: sponsorship.stripe_subscription_id
        });

        // Extract bestie name from joined sponsor_besties data
        const bestieName = (sponsorship as any).sponsor_besties?.bestie_name || 'Unknown Bestie';
        logStep("Bestie name extracted", { sponsorshipId: sponsorship.id, bestieName });

        let invoiceDate: Date;
        let transactionId: string;

        // Try to get Stripe data, fall back to sponsorship data if not available
        if (sponsorship.stripe_subscription_id) {
          try {
            const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
            
            // Get most recent invoice
            const invoices = await stripe.invoices.list({
              subscription: sponsorship.stripe_subscription_id,
              limit: 1,
              status: 'paid'
            });

            if (invoices.data && invoices.data.length > 0) {
              const invoice = invoices.data[0];
              invoiceDate = new Date(invoice.created * 1000);
              transactionId = invoice.payment_intent as string;
            } else {
              // No paid invoices, use current date and generate transaction ID
              invoiceDate = new Date();
              transactionId = `backfill_${sponsorship.id}_${Date.now()}`;
            }
          } catch (stripeError: any) {
            // Subscription doesn't exist in Stripe (deleted/cancelled)
            logStep("Stripe subscription not found, using fallback data", { 
              sponsorshipId: sponsorship.id,
              error: stripeError.message 
            });
            invoiceDate = new Date();
            transactionId = `backfill_${sponsorship.id}_${Date.now()}`;
          }
        } else {
          // No subscription ID, use fallback data
          invoiceDate = new Date();
          transactionId = `backfill_${sponsorship.id}_${Date.now()}`;
        }

        const taxYear = invoiceDate.getFullYear();

        // Generate receipt number
        const { data: existingReceipts } = await supabaseClient
          .from('sponsorship_receipts')
          .select('receipt_number')
          .eq('tax_year', taxYear)
          .order('receipt_number', { ascending: false })
          .limit(1);

        const lastNumber = existingReceipts?.[0]?.receipt_number 
          ? parseInt(existingReceipts[0].receipt_number.split('-')[1]) 
          : 0;
        const receiptNumber = `${taxYear}-${String(lastNumber + 1).padStart(6, '0')}`;

        // Prepare receipt data with detailed logging
        const receiptData = {
          transaction_id: transactionId,
          sponsorship_id: sponsorship.id,
          user_id: sponsorship.sponsor_id,
          sponsor_email: sponsorship.sponsor_email || 'unknown@example.com',
          bestie_name: bestieName,
          amount: sponsorship.amount,
          frequency: sponsorship.frequency,
          transaction_date: invoiceDate.toISOString(),
          organization_name: receiptSettings.organization_name,
          organization_ein: receiptSettings.organization_ein,
          receipt_number: receiptNumber,
          tax_year: taxYear,
          stripe_mode: sponsorship.stripe_mode || 'test'
        };

        logStep("Attempting to insert receipt", {
          sponsorshipId: sponsorship.id,
          receiptData
        });

        // Create receipt record
        const { error: insertError } = await supabaseClient
          .from('sponsorship_receipts')
          .insert(receiptData);

        if (insertError) {
          results.failed++;
          results.errors.push({
            sponsorshipId: sponsorship.id,
            error: insertError.message
          });
          logStep("Failed to create receipt", { 
            sponsorshipId: sponsorship.id,
            error: insertError,
            attemptedData: receiptData
          });
          continue;
        }

        results.created++;
        if (mode === 'live') {
          results.liveCreated++;
        } else {
          results.testCreated++;
        }
        logStep("Receipt created", { 
          sponsorshipId: sponsorship.id, 
          receiptNumber,
          amount: sponsorship.amount,
          mode 
        });

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          sponsorshipId: sponsorship.id,
          mode,
          error: error.message
        });
        logStep("Error processing sponsorship", { 
          sponsorshipId: sponsorship.id,
          mode, 
          error: error.message 
        });
      }
    }
    }

    logStep("Backfill complete", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete: ${results.created} receipts created (${results.liveCreated} live, ${results.testCreated} test), ${results.failed} failed`,
        created: results.created,
        failed: results.failed,
        testCreated: results.testCreated,
        liveCreated: results.liveCreated,
        errors: results.errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
