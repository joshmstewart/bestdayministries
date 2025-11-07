import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // Get all sponsorships (including stripe_customer_id for payment intent lookup)
    const { data: sponsorships, error: sponsorshipsError } = await supabaseAdmin
      .from('sponsorships')
      .select('id, amount, stripe_subscription_id, stripe_customer_id, stripe_mode, frequency, created_at')
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

        let coverStripeFee = false;
        let metadataAmount = null;

        // Check if this is a subscription ID or payment intent ID
        if (sponsorship.stripe_subscription_id.startsWith('sub_')) {
          // It's a subscription - retrieve subscription details
          console.log(`   Type: Subscription`);
          const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
          
          coverStripeFee = subscription.metadata?.coverStripeFee === 'true';
          metadataAmount = subscription.metadata?.amount ? parseFloat(subscription.metadata.amount) : null;
          
          console.log(`   Cover fees: ${coverStripeFee}`);
          console.log(`   Metadata amount: $${metadataAmount?.toFixed(2) || 'N/A'}`);
        } else if (sponsorship.stripe_subscription_id.startsWith('pi_')) {
          // It's a payment intent - retrieve payment intent details
          console.log(`   Type: Payment Intent (one-time)`);
          const paymentIntent = await stripe.paymentIntents.retrieve(sponsorship.stripe_subscription_id);
          
          coverStripeFee = paymentIntent.metadata?.coverStripeFee === 'true';
          metadataAmount = paymentIntent.metadata?.amount ? parseFloat(paymentIntent.metadata.amount) : null;
          
          console.log(`   Cover fees: ${coverStripeFee}`);
          console.log(`   Metadata amount: $${metadataAmount?.toFixed(2) || 'N/A'}`);
          console.log(`   Payment Intent amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
        } else {
          console.log(`   ⚠️ Unknown Stripe ID format: ${sponsorship.stripe_subscription_id}`);
          continue;
        }

        // CRITICAL: If coverStripeFee was true, the metadataAmount is the BASE amount
        // We need to calculate UP to the full amount, not use metadata directly
        if (coverStripeFee && metadataAmount) {
          // Calculate the FULL amount from the base amount stored in metadata
          const expectedWithFees = (metadataAmount + 0.30) / 0.971;
          const difference = expectedWithFees - sponsorship.amount;
          
          console.log(`   Expected with fees: $${expectedWithFees.toFixed(2)}`);
          console.log(`   Difference: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`);
          
          // Only update if the stored amount doesn't match the full amount
          if (Math.abs(difference) > 0.01) {
            console.log(`   ✅ UPDATE NEEDED:`);
            console.log(`      Before: $${sponsorship.amount.toFixed(2)}`);
            console.log(`      After:  $${expectedWithFees.toFixed(2)}`);
            console.log(`      Base amount: $${metadataAmount.toFixed(2)}`);
            
            const { error: updateError } = await supabaseAdmin
              .from('sponsorships')
              .update({ amount: parseFloat(expectedWithFees.toFixed(2)) })
              .eq('id', sponsorship.id);

            if (updateError) {
              console.error(`   ❌ Failed to update:`, updateError);
            } else {
              console.log(`   ✅ Sponsorship record updated successfully`);
              updates.push({
                id: sponsorship.id,
                oldAmount: sponsorship.amount,
                newAmount: parseFloat(expectedWithFees.toFixed(2))
              });
            }
          } else {
            console.log(`   ✅ Amount already correct (no update needed)`);
          }
        } else if (!coverStripeFee && metadataAmount) {
          // If fees NOT covered, metadata amount IS the correct amount
          const difference = metadataAmount - sponsorship.amount;
          
          console.log(`   Expected (no fees): $${metadataAmount.toFixed(2)}`);
          console.log(`   Difference: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`);
          
          if (Math.abs(difference) > 0.01) {
            console.log(`   ✅ UPDATE NEEDED:`);
            console.log(`      Before: $${sponsorship.amount.toFixed(2)}`);
            console.log(`      After:  $${metadataAmount.toFixed(2)}`);
            
            const { error: updateError } = await supabaseAdmin
              .from('sponsorships')
              .update({ amount: metadataAmount })
              .eq('id', sponsorship.id);

            if (updateError) {
              console.error(`   ❌ Failed to update:`, updateError);
            } else {
              console.log(`   ✅ Sponsorship record updated successfully`);
              updates.push({
                id: sponsorship.id,
                oldAmount: sponsorship.amount,
                newAmount: metadataAmount
              });
            }
          } else {
            console.log(`   ✅ Amount already correct (no update needed)`);
          }
        } else {
          console.log(`   ⚠️ Missing metadata amount - cannot verify/update`);
        }
      } catch (error) {
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
  } catch (error) {
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
