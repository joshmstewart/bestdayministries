import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('\n🔄 Monthly Receipt Generation - Starting...');
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate date range for previous month
    const now = new Date();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const previousMonth = firstDayPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    console.log(`📅 Generating receipts for: ${previousMonth}`);
    console.log(`   Date range: ${firstDayPrevMonth.toISOString()} to ${lastDayPrevMonth.toISOString()}`);

    // Get all active monthly sponsorships
    const { data: sponsorships, error: sponsorshipsError } = await supabaseAdmin
      .from('sponsorships')
      .select(`
        id,
        sponsor_id,
        sponsor_email,
        bestie_id,
        sponsor_bestie_id,
        amount,
        frequency,
        status,
        stripe_subscription_id,
        stripe_mode,
        started_at,
        ended_at,
        sponsor_besties!inner (
          bestie_name
        ),
        profiles!sponsorships_sponsor_id_fkey (
          email,
          display_name
        )
      `)
      .eq('frequency', 'monthly')
      .eq('status', 'active')
      .lte('started_at', lastDayPrevMonth.toISOString())
      .or(`ended_at.is.null,ended_at.gte.${firstDayPrevMonth.toISOString()}`);

    if (sponsorshipsError) {
      console.error('❌ Error fetching sponsorships:', sponsorshipsError);
      throw sponsorshipsError;
    }

    console.log(`\n📊 Found ${sponsorships?.length || 0} active monthly sponsorships to process`);

    const results = {
      total: sponsorships?.length || 0,
      receiptsCreated: 0,
      emailsSent: 0,
      skipped: 0,
      errors: [] as Array<{ sponsorshipId: string; error: string }>
    };

    if (!sponsorships || sponsorships.length === 0) {
      console.log('ℹ️  No active monthly sponsorships found - nothing to do');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active monthly sponsorships to process',
          results 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each sponsorship
    for (const sponsorship of sponsorships) {
      try {
        const sponsorEmail = (sponsorship as any).profiles?.email || sponsorship.sponsor_email;
        const sponsorName = (sponsorship as any).profiles?.display_name;
        const bestieName = (sponsorship as any).sponsor_besties?.bestie_name;

        console.log(`\n💰 Processing sponsorship ${sponsorship.id}`);
        console.log(`   Sponsor: ${sponsorEmail}`);
        console.log(`   Bestie: ${bestieName}`);
        console.log(`   Amount: $${sponsorship.amount}`);
        console.log(`   Mode: ${sponsorship.stripe_mode}`);

        // Check if receipt already exists for this month
        const receiptCheckStart = new Date(firstDayPrevMonth);
        receiptCheckStart.setHours(0, 0, 0, 0);
        const receiptCheckEnd = new Date(lastDayPrevMonth);
        receiptCheckEnd.setHours(23, 59, 59, 999);

        const { data: existingReceipts, error: checkError } = await supabaseAdmin
          .from('sponsorship_receipts')
          .select('id')
          .eq('sponsorship_id', sponsorship.id)
          .gte('transaction_date', receiptCheckStart.toISOString())
          .lte('transaction_date', receiptCheckEnd.toISOString());

        if (checkError) {
          console.error(`   ❌ Error checking existing receipts:`, checkError);
          throw checkError;
        }

        if (existingReceipts && existingReceipts.length > 0) {
          console.log(`   ⏭️  Receipt already exists for ${previousMonth} - skipping`);
          results.skipped++;
          continue;
        }

        // Generate receipt number
        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const transactionDate = lastDayPrevMonth.toISOString();

        // Insert receipt record
        const { data: receipt, error: receiptError } = await supabaseAdmin
          .from('sponsorship_receipts')
          .insert({
            sponsorship_id: sponsorship.id,
            user_id: sponsorship.sponsor_id,
            sponsor_email: sponsorEmail,
            sponsor_name: sponsorName || null,
            bestie_name: bestieName,
            amount: sponsorship.amount,
            frequency: 'monthly',
            transaction_id: sponsorship.stripe_subscription_id || sponsorship.id,
            transaction_date: transactionDate,
            receipt_number: receiptNumber,
            tax_year: firstDayPrevMonth.getFullYear(),
            stripe_mode: sponsorship.stripe_mode || 'live',
            organization_name: null, // Will be populated from settings
            organization_ein: null // Will be populated from settings
          })
          .select()
          .single();

        if (receiptError) {
          console.error(`   ❌ Error creating receipt:`, receiptError);
          throw receiptError;
        }

        console.log(`   ✅ Receipt created: ${receiptNumber}`);
        results.receiptsCreated++;

        // Send receipt email via existing function
        try {
          const emailResponse = await supabaseAdmin.functions.invoke('send-sponsorship-receipt', {
            body: {
              sponsorshipId: sponsorship.id,
              sponsorEmail,
              sponsorName,
              bestieName,
              amount: sponsorship.amount,
              frequency: 'monthly',
              transactionId: sponsorship.stripe_subscription_id || sponsorship.id,
              transactionDate,
              stripeMode: sponsorship.stripe_mode || 'live'
            }
          });

          if (emailResponse.error) {
            console.error(`   ⚠️  Email send failed:`, emailResponse.error);
            results.errors.push({
              sponsorshipId: sponsorship.id,
              error: `Email failed: ${emailResponse.error.message || 'Unknown error'}`
            });
          } else {
            console.log(`   ✅ Email sent successfully`);
            results.emailsSent++;

            // Update receipt with sent timestamp
            await supabaseAdmin
              .from('sponsorship_receipts')
              .update({ sent_at: new Date().toISOString() })
              .eq('id', receipt.id);
          }
        } catch (emailError) {
          console.error(`   ⚠️  Email send exception:`, emailError);
          results.errors.push({
            sponsorshipId: sponsorship.id,
            error: `Email exception: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
          });
        }

      } catch (error) {
        console.error(`   ❌ Error processing sponsorship ${sponsorship.id}:`, error);
        results.errors.push({
          sponsorshipId: sponsorship.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MONTHLY RECEIPT GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Period: ${previousMonth}`);
    console.log(`Total sponsorships: ${results.total}`);
    console.log(`Receipts created: ${results.receiptsCreated}`);
    console.log(`Emails sent: ${results.emailsSent}`);
    console.log(`Skipped (already exists): ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(e => {
        console.log(`  - ${e.sponsorshipId}: ${e.error}`);
      });
    }
    console.log('='.repeat(60) + '\n');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Generated ${results.receiptsCreated} receipts for ${previousMonth}`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('❌ Fatal error in generate-receipts:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
