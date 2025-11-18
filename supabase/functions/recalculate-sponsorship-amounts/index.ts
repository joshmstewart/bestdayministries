import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    // Verify admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      throw new Error("Admin access required");
    }

    // Get all sponsorships (including stripe_customer_id and started_at for fallback lookups)
    const { data: sponsorships, error: sponsorshipsError } = await supabaseAdmin
      .from('sponsorships')
      .select('id, amount, stripe_subscription_id, stripe_customer_id, stripe_mode, frequency, started_at')
      .not('stripe_subscription_id', 'is', null);

    if (sponsorshipsError) throw sponsorshipsError;

    console.log(`Found ${sponsorships?.length || 0} sponsorships to check`);

    const updates: Array<{ id: string; oldAmount: number; newAmount: number }> = [];
    
    for (const sponsorship of sponsorships || []) {
      try {
        const mode = sponsorship.stripe_mode || 'test';
        const stripeKey = mode === 'live' 
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) continue;

        const stripe = new Stripe(stripeKey, {
          apiVersion: '2025-08-27.basil',
        });

        console.log(`\n💰 Sponsorship ${sponsorship.id}`);
        console.log(`   Currently recorded: $${sponsorship.amount.toFixed(2)}`);
        console.log(`   Stripe ID: ${sponsorship.stripe_subscription_id}`);
        console.log(`   Frequency: ${sponsorship.frequency}`);

        // Declare variables at loop level for proper scoping
        let coverStripeFee = false;
        let metadataAmount: number | null = null;
        let determinedAmount: number | null = null;
        let methodUsed = '';

        // Check if this is a subscription ID or payment intent ID
        if (sponsorship.stripe_subscription_id.startsWith('sub_')) {
          // It's a subscription - retrieve subscription details
          console.log(`   Type: Subscription`);
          const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
          
          // Get the actual subscription price amount (source of truth)
          const subscriptionItemPrice = subscription.items.data[0]?.price?.unit_amount;
          if (subscriptionItemPrice) {
            determinedAmount = subscriptionItemPrice / 100;
            methodUsed = 'subscription_price_amount';
            console.log(`   ✅ Using subscription price: $${determinedAmount.toFixed(2)}`);
          } else {
            // Fallback to metadata if price not available
            coverStripeFee = subscription.metadata?.coverStripeFee === 'true';
            metadataAmount = subscription.metadata?.amount ? parseFloat(subscription.metadata.amount) : null;
            methodUsed = 'subscription_metadata';
            determinedAmount = metadataAmount;
            console.log(`   Cover fees: ${coverStripeFee}`);
            console.log(`   Metadata amount: $${metadataAmount?.toFixed(2) || 'N/A'}`);
          }
        } else if (sponsorship.stripe_subscription_id.startsWith('pi_')) {
          // It's a payment intent - use sophisticated fallback chain
          console.log(`   Type: Payment Intent (one-time)`);
          console.log(`\n   ╔═══════════════════════════════════════════════════════════╗`);
          console.log(`   ║  🔍 FALLBACK CHAIN - Finding Correct Amount              ║`);
          console.log(`   ╚═══════════════════════════════════════════════════════════╝`);
          const paymentIntent = await stripe.paymentIntents.retrieve(sponsorship.stripe_subscription_id);

          // STEP 1: Try using metadata (primary method)
          console.log(`\n   📋 STEP 1: Checking Payment Intent Metadata...`);
          const metaCoverFee = paymentIntent.metadata?.coverStripeFee === 'true';
          const metaAmount = paymentIntent.metadata?.amount ? parseFloat(paymentIntent.metadata.amount) : null;
          
          if (metaAmount && metaAmount > 0) {
            if (metaCoverFee) {
              determinedAmount = (metaAmount + 0.30) / 0.971;
            } else {
              determinedAmount = metaAmount;
            }
            methodUsed = 'step_1_metadata';
            console.log(`   ✅ STEP 1 SUCCESS: Using Payment Intent metadata`);
            console.log(`      • Cover fees: ${metaCoverFee}`);
            console.log(`      • Base amount from metadata: $${metaAmount.toFixed(2)}`);
            console.log(`      • Calculated final amount: $${determinedAmount.toFixed(2)}`);
          } else {
            console.log(`   ❌ STEP 1 FAILED: Metadata incomplete`);
            console.log(`      • coverStripeFee: ${metaCoverFee}`);
            console.log(`      • amount: ${metaAmount || 'missing'}`);
          }

          // STEP 2: Fallback - Query charges by payment intent ID
          if (!determinedAmount) {
            console.log(`\n   💳 STEP 2: Querying Stripe Charges by Payment Intent ID...`);
            try {
              const charges = await stripe.charges.list({
                payment_intent: sponsorship.stripe_subscription_id,
                limit: 10
              });

              console.log(`      • Found ${charges.data.length} charge(s) for this payment intent`);
              
              if (charges.data.length > 0) {
                // Use the first successful charge
                const successfulCharge = charges.data.find((c: Stripe.Charge) => c.status === 'succeeded');
                if (successfulCharge) {
                  determinedAmount = successfulCharge.amount / 100;
                  methodUsed = 'step_2_charge_by_payment_intent';
                  console.log(`   ✅ STEP 2 SUCCESS: Found successful charge`);
                  console.log(`      • Charge ID: ${successfulCharge.id}`);
                  console.log(`      • Charge amount: $${determinedAmount.toFixed(2)}`);
                  console.log(`      • Charge status: ${successfulCharge.status}`);
                } else {
                  console.log(`   ❌ STEP 2 FAILED: No successful charges found`);
                  console.log(`      • Total charges: ${charges.data.length}`);
                  console.log(`      • Charge statuses: ${charges.data.map((c: Stripe.Charge) => c.status).join(', ')}`);
                }
              } else {
                console.log(`   ❌ STEP 2 FAILED: No charges returned from Stripe`);
              }
            } catch (chargeError) {
              console.log(`   ❌ STEP 2 FAILED: Error querying charges`);
              console.log(`      • Error: ${chargeError instanceof Error ? chargeError.message : 'Unknown error'}`);
            }
          } else {
            console.log(`\n   ⏭️  STEP 2: Skipped (amount already determined)`);
          }

          // STEP 3: Fallback - Query charges by customer ID + time window
          if (!determinedAmount && sponsorship.stripe_customer_id) {
            console.log(`\n   🕐 STEP 3: Querying Charges by Customer ID + Time Window...`);
            try {
              const createdAt = new Date(sponsorship.started_at);
              const oneHourBefore = Math.floor(createdAt.getTime() / 1000) - 3600;
              const oneHourAfter = Math.floor(createdAt.getTime() / 1000) + 3600;

              console.log(`      • Time window: ${new Date(oneHourBefore * 1000).toISOString()} to ${new Date(oneHourAfter * 1000).toISOString()}`);
              
              const charges = await stripe.charges.list({
                customer: sponsorship.stripe_customer_id,
                created: {
                  gte: oneHourBefore,
                  lte: oneHourAfter
                },
                limit: 20
              });

              console.log(`      • Found ${charges.data.length} charge(s) in time window`);

              if (charges.data.length > 0) {
                // Calculate expected amounts for matching
                const expectedWithFees = (sponsorship.amount + 0.30) / 0.971;
                const tolerance = 1.0;

                console.log(`      • Looking for charge matching: $${expectedWithFees.toFixed(2)} or $${sponsorship.amount.toFixed(2)} (±$${tolerance})`);
                
                // Try to match charge amount
                const matchedCharge = charges.data.find((charge: Stripe.Charge) => {
                  const chargeAmount = charge.amount / 100;
                  return (
                    Math.abs(chargeAmount - expectedWithFees) < tolerance ||
                    Math.abs(chargeAmount - sponsorship.amount) < tolerance
                  );
                });

                if (matchedCharge) {
                  determinedAmount = matchedCharge.amount / 100;
                  methodUsed = 'step_3_charge_by_customer_time';
                  console.log(`   ✅ STEP 3 SUCCESS: Matched charge within time window`);
                  console.log(`      • Charge ID: ${matchedCharge.id}`);
                  console.log(`      • Charge amount: $${determinedAmount.toFixed(2)}`);
                  console.log(`      • Charge created: ${new Date((matchedCharge.created || 0) * 1000).toISOString()}`);
                } else {
                  console.log(`   ❌ STEP 3 FAILED: No matching charges in time window`);
                  console.log(`      • Charge amounts found: ${charges.data.map((c: Stripe.Charge) => `$${(c.amount / 100).toFixed(2)}`).join(', ')}`);
                }
              } else {
                console.log(`   ❌ STEP 3 FAILED: No charges in time window`);
              }
            } catch (chargeError) {
              console.log(`   ❌ STEP 3 FAILED: Error querying charges by customer`);
              console.log(`      • Error: ${chargeError instanceof Error ? chargeError.message : 'Unknown error'}`);
            }
          } else if (!determinedAmount) {
            console.log(`\n   ⏭️  STEP 3: Skipped (no stripe_customer_id available)`);
          } else {
            console.log(`\n   ⏭️  STEP 3: Skipped (amount already determined)`);
          }

          // STEP 4: Fallback - Use payment intent amount directly
          if (!determinedAmount && paymentIntent.amount > 0) {
            console.log(`\n   🔄 STEP 4: Using Payment Intent Amount Directly (Last Resort)...`);
            determinedAmount = paymentIntent.amount / 100;
            methodUsed = 'step_4_payment_intent_direct';
            console.log(`   ✅ STEP 4 SUCCESS: Using payment intent amount as fallback`);
            console.log(`      • Payment Intent amount: $${determinedAmount.toFixed(2)}`);
            console.log(`      • Note: This is the actual amount charged in Stripe`);
          } else if (!determinedAmount) {
            console.log(`\n   ⏭️  STEP 4: Skipped (payment intent amount is 0 or invalid)`);
          } else {
            console.log(`\n   ⏭️  STEP 4: Skipped (amount already determined)`);
          }

          // Set the metadata values for the rest of the logic
          if (determinedAmount) {
            console.log(`\n   ╔═══════════════════════════════════════════════════════════╗`);
            console.log(`   ║  ✅ FALLBACK CHAIN RESULT                                ║`);
            console.log(`   ╠═══════════════════════════════════════════════════════════╣`);
            console.log(`   ║  Method Used: ${methodUsed.padEnd(43)} ║`);
            console.log(`   ║  Final Amount: $${determinedAmount.toFixed(2).padEnd(41)} ║`);
            console.log(`   ║  Current DB Amount: $${sponsorship.amount.toFixed(2).padEnd(36)} ║`);
            console.log(`   ╚═══════════════════════════════════════════════════════════╝`);
            
            // Determine if fees were covered by comparing to known patterns
            const possibleBaseLow = determinedAmount * 0.971 - 0.30;
            const possibleBaseHigh = determinedAmount;
            coverStripeFee = Math.abs(possibleBaseLow - (metaAmount || 0)) < Math.abs(possibleBaseHigh - (metaAmount || 0)) && metaAmount !== null;
            metadataAmount = determinedAmount;
          } else {
            console.log(`\n   ╔═══════════════════════════════════════════════════════════╗`);
            console.log(`   ║  ❌ FALLBACK CHAIN FAILED                                ║`);
            console.log(`   ╠═══════════════════════════════════════════════════════════╣`);
            console.log(`   ║  All 4 methods failed to determine correct amount        ║`);
            console.log(`   ║  Skipping this sponsorship                               ║`);
            console.log(`   ╚═══════════════════════════════════════════════════════════╝`);
            continue;
          }
        } else {
          console.log(`   ⚠️ Unknown Stripe ID format: ${sponsorship.stripe_subscription_id}`);
          continue;
        }

        // Update logic: compare determined amount with stored amount
        if (determinedAmount && determinedAmount > 0) {
          const difference = determinedAmount - sponsorship.amount;
          
          console.log(`   Expected amount: $${determinedAmount.toFixed(2)}`);
          console.log(`   Current amount: $${sponsorship.amount.toFixed(2)}`);
          console.log(`   Difference: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`);
          
          // Only update if there's a significant difference
          if (Math.abs(difference) > 0.01) {
            console.log(`   ✅ UPDATE NEEDED:`);
            console.log(`      Before: $${sponsorship.amount.toFixed(2)}`);
            console.log(`      After:  $${determinedAmount.toFixed(2)}`);
            console.log(`      Method: ${methodUsed}`);
            
            const { error: updateError } = await supabaseAdmin
              .from('sponsorships')
              .update({ amount: parseFloat(determinedAmount.toFixed(2)) })
              .eq('id', sponsorship.id);

            if (updateError) {
              console.error(`   ❌ Failed to update:`, updateError);
            } else {
              console.log(`   ✅ Sponsorship record updated successfully`);
              updates.push({
                id: sponsorship.id,
                oldAmount: sponsorship.amount,
                newAmount: parseFloat(determinedAmount.toFixed(2))
              });
            }
          } else {
            console.log(`   ✅ Amount already correct (no update needed)`);
          }
        } else {
          console.log(`   ⚠️ Could not determine correct amount - skipping update`);
        }
      } catch (error: unknown) {
        console.error(`\n❌ Error processing sponsorship ${sponsorship.id}:`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`   Stripe ID: ${sponsorship.stripe_subscription_id}`);
        console.error(`   This sponsorship will be skipped`);
      }
    }

    // Also update receipts to match
    console.log(`\n📝 Updating receipts for ${updates.length} sponsorships...`);
    for (const update of updates) {
      const { error: receiptError } = await supabaseAdmin
        .from('sponsorship_receipts')
        .update({ amount: update.newAmount })
        .eq('sponsorship_id', update.id);

      if (receiptError) {
        console.error(`   ❌ Failed to update receipt for ${update.id}:`, receiptError);
      } else {
        console.log(`   ✅ Receipt updated for sponsorship ${update.id}`);
      }
    }

    console.log(`\n✅ Recalculation complete: ${updates.length} sponsorships updated`);

    return new Response(
      JSON.stringify({ 
        success: true,
        updatedCount: updates.length,
        updates
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error recalculating amounts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
