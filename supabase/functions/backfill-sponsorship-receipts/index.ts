import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Query ALL donations that need receipts
    const { data: donations, error: donationsError } = await supabaseClient
      .from('donations')
      .select('*')
      .in('status', ['active', 'completed']);

    if (donationsError) throw donationsError;

    logStep("Found sponsorships and donations", { 
      sponsorships: sponsorships?.length || 0,
      donations: donations?.length || 0 
    });

    // Filter sponsorships to only those with no receipts
    const sponsorshipsWithReceiptCount = await Promise.all(
      (sponsorships || []).map(async (s) => {
        const { count } = await supabaseClient
          .from('sponsorship_receipts')
          .select('*', { count: 'exact', head: true })
          .eq('sponsorship_id', s.id);
        return { ...s, receiptCount: count || 0, type: 'sponsorship' };
      })
    );

    // Filter donations to only those with no receipts
    const donationsWithReceiptCount = await Promise.all(
      (donations || []).map(async (d) => {
        const { count } = await supabaseClient
          .from('sponsorship_receipts')
          .select('*', { count: 'exact', head: true })
          .eq('sponsorship_id', d.id);
        return { ...d, receiptCount: count || 0, type: 'donation' };
      })
    );

    const sponsorshipsNeedingReceipts = sponsorshipsWithReceiptCount.filter(s => s.receiptCount === 0);
    const donationsNeedingReceipts = donationsWithReceiptCount.filter(d => d.receiptCount === 0);
    
    logStep("Items needing receipts", { 
      sponsorships: sponsorshipsNeedingReceipts.length,
      donations: donationsNeedingReceipts.length 
    });

    if (sponsorshipsNeedingReceipts.length === 0 && donationsNeedingReceipts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No sponsorships or donations need backfilled receipts',
          created: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine sponsorships and donations for processing
    const allItemsNeedingReceipts = [
      ...sponsorshipsNeedingReceipts,
      ...donationsNeedingReceipts
    ];

    // Get receipt settings
    const { data: receiptSettings } = await supabaseClient
      .from('receipt_settings')
      .select('*')
      .single();

    if (!receiptSettings || !receiptSettings.enable_receipts) {
      throw new Error('Receipt generation is not enabled');
    }

    // Group all items by stripe_mode
    const itemsByMode = allItemsNeedingReceipts.reduce((acc, item) => {
      const mode = item.stripe_mode || 'test';
      if (!acc[mode]) acc[mode] = [];
      acc[mode].push(item);
      return acc;
    }, {} as Record<string, typeof allItemsNeedingReceipts>);

    logStep("Items grouped by mode", { 
      test: itemsByMode.test?.length || 0,
      live: itemsByMode.live?.length || 0
    });

    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[],
      testCreated: 0,
      liveCreated: 0
    };

    // Track receipt numbers by tax year to avoid race conditions
    const receiptNumberCounters = new Map<number, number>();

    // Process each mode separately
    for (const [mode, modeItems] of Object.entries(itemsByMode)) {
      const items = modeItems as typeof allItemsNeedingReceipts;
      
      const stripeKey = mode === 'live' 
        ? Deno.env.get('STRIPE_SECRET_KEY')
        : Deno.env.get('STRIPE_SECRET_KEY_TEST');

      if (!stripeKey) {
        logStep(`Skipping ${mode} mode - no Stripe key configured`);
        continue;
      }

      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
      logStep(`Processing ${mode} mode`, { count: items.length });

      // Pre-calculate starting receipt numbers for each tax year
      for (const item of items) {
        const tempDate = new Date();
        const taxYear = tempDate.getFullYear();
        
        if (!receiptNumberCounters.has(taxYear)) {
          // Query once per tax year
          const { data: existingReceipts } = await supabaseClient
            .from('sponsorship_receipts')
            .select('receipt_number')
            .eq('tax_year', taxYear)
            .order('receipt_number', { ascending: false })
            .limit(100); // Get more records to find properly formatted ones
          
          // Only parse receipt numbers in YYYY-NNNNNN format
          const properlyFormattedReceipts = (existingReceipts || [])
            .filter(r => r.receipt_number && /^\d{4}-\d{6}$/.test(r.receipt_number));
          
          const lastNumber = properlyFormattedReceipts.length > 0
            ? parseInt(properlyFormattedReceipts[0].receipt_number.split('-')[1]) 
            : 0;
          
          receiptNumberCounters.set(taxYear, lastNumber);
          logStep(`Initialized receipt counter for ${taxYear}`, { 
            startingNumber: lastNumber,
            totalExistingReceipts: existingReceipts?.length || 0,
            properlyFormattedReceipts: properlyFormattedReceipts.length
          });
        }
      }

      // Process each item (sponsorship or donation) in this mode
      for (const item of items) {
      try {
        const isSponsorship = item.type === 'sponsorship';
        
        logStep(`Processing ${item.type}`, { 
          id: item.id, 
          email: isSponsorship ? item.sponsor_email : item.donor_email,
          subscriptionId: isSponsorship ? item.stripe_subscription_id : null
        });

        // Extract bestie name or use "General Support" for donations
        const bestieName = isSponsorship 
          ? ((item as any).sponsor_besties?.bestie_name || 'Unknown Bestie')
          : 'General Support';
        logStep("Name extracted", { itemId: item.id, name: bestieName, type: item.type });

        let invoiceDate: Date;
        let transactionId: string;

        // Try to get Stripe data for sponsorships, donations use simpler logic
        if (isSponsorship && item.stripe_subscription_id) {
          try {
            const subscription = await stripe.subscriptions.retrieve(item.stripe_subscription_id);
            
            // Get most recent invoice
            const invoices = await stripe.invoices.list({
              subscription: item.stripe_subscription_id,
              limit: 1,
              status: 'paid'
            });

            if (invoices.data && invoices.data.length > 0) {
              const invoice = invoices.data[0];
              invoiceDate = new Date(invoice.created * 1000);
              transactionId = invoice.payment_intent as string;
            } else {
              invoiceDate = new Date();
              transactionId = `backfill_${item.id}_${Date.now()}`;
            }
          } catch (stripeError: any) {
            logStep("Stripe subscription not found, using fallback data", { 
              itemId: item.id,
              error: stripeError.message 
            });
            invoiceDate = new Date();
            transactionId = `backfill_${item.id}_${Date.now()}`;
          }
        } else {
          // Donation or sponsorship without subscription ID
          invoiceDate = new Date();
          transactionId = `backfill_${item.id}_${Date.now()}`;
        }

        const taxYear = invoiceDate.getFullYear();

        // Get and increment receipt number for this tax year
        const currentReceiptNumber = (receiptNumberCounters.get(taxYear) || 0) + 1;
        receiptNumberCounters.set(taxYear, currentReceiptNumber);
        const receiptNumber = `${taxYear}-${String(currentReceiptNumber).padStart(6, '0')}`;

        logStep("Generated receipt number", {
          itemId: item.id,
          type: item.type,
          taxYear,
          receiptNumber,
          counter: currentReceiptNumber
        });

        // Prepare receipt data - handle both sponsorships and donations
        const receiptData = {
          transaction_id: transactionId,
          sponsorship_id: item.id,
          user_id: isSponsorship ? item.sponsor_id : item.donor_id,
          sponsor_email: isSponsorship 
            ? (item.sponsor_email || 'unknown@example.com')
            : (item.donor_email || 'unknown@example.com'),
          bestie_name: bestieName,
          amount: isSponsorship ? item.amount : (item.amount_charged || item.amount),
          frequency: item.frequency,
          transaction_date: invoiceDate.toISOString(),
          organization_name: receiptSettings.organization_name,
          organization_ein: receiptSettings.organization_ein,
          receipt_number: receiptNumber,
          tax_year: taxYear,
          stripe_mode: item.stripe_mode || 'test'
        };

        logStep("Attempting to insert receipt", {
          itemId: item.id,
          type: item.type,
          receiptData
        });

        // Create receipt record
        const { error: insertError } = await supabaseClient
          .from('sponsorship_receipts')
          .insert(receiptData);

        if (insertError) {
          results.failed++;
          results.errors.push({
            itemId: item.id,
            type: item.type,
            error: insertError.message
          });
          logStep("Failed to create receipt", { 
            itemId: item.id,
            type: item.type,
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
          itemId: item.id,
          type: item.type,
          receiptNumber,
          amount: receiptData.amount,
          mode 
        });

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          itemId: item.id,
          type: item.type,
          mode,
          error: error.message
        });
        logStep(`Error processing ${item.type}`, { 
          itemId: item.id,
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
