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

    // Get all completed one-time donations
    const { data: donations, error: donationsError } = await supabaseAdmin
      .from('donations')
      .select('id, amount, amount_charged, stripe_customer_id, stripe_mode, created_at')
      .eq('frequency', 'one-time')
      .eq('status', 'completed')
      .not('stripe_customer_id', 'is', null);

    if (donationsError) throw donationsError;

    console.log(`Found ${donations?.length || 0} one-time donations to check`);

    const updates: Array<{ id: string; oldAmount: number; newAmount: number; actualCharged: number }> = [];
    
    for (const donation of donations || []) {
      try {
        const mode = donation.stripe_mode || 'test';
        const stripeKey = mode === 'live' 
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) continue;

        const stripe = new Stripe(stripeKey, {
          apiVersion: '2025-08-27.basil',
        });

        // Get payment intents for this customer around the donation time
        const donationDate = new Date(donation.created_at);
        const searchStart = Math.floor(donationDate.getTime() / 1000) - 3600; // 1 hour before
        const searchEnd = Math.floor(donationDate.getTime() / 1000) + 3600; // 1 hour after

        const charges = await stripe.charges.list({
          customer: donation.stripe_customer_id,
          created: {
            gte: searchStart,
            lte: searchEnd,
          },
          limit: 10,
        });

        console.log(`💰 Donation ${donation.id} (base: $${donation.amount}, recorded: $${donation.amount_charged})`);
        console.log(`   Found ${charges.data.length} charges in time window`);

        // Find the charge that matches this donation amount
        const matchingCharge = charges.data.find((charge: Stripe.Charge) => {
          const chargeAmount = charge.amount / 100;
          
          // Calculate what the fee-covered amount should be: (amount + 0.30) / 0.971
          const expectedWithFees = (donation.amount + 0.30) / 0.971;
          
          // Match if within $1 of expected fee-covered amount OR base amount OR current recorded amount
          return Math.abs(chargeAmount - expectedWithFees) < 1 || 
                 Math.abs(chargeAmount - donation.amount) < 1 ||
                 Math.abs(chargeAmount - donation.amount_charged) < 1;
        });

        if (matchingCharge) {
          const actualCharged = matchingCharge.amount / 100;
          
          // Only update if the recorded amount is wrong
          if (Math.abs(donation.amount_charged - actualCharged) > 0.01) {
            console.log(`   ✅ FOUND: Actual charged $${actualCharged} vs recorded $${donation.amount_charged}`);
            console.log(`   🔧 Updating amount_charged: $${donation.amount_charged} → $${actualCharged}`);
            
            const { error: updateError } = await supabaseAdmin
              .from('donations')
              .update({ amount_charged: actualCharged })
              .eq('id', donation.id);

            if (updateError) {
              console.error(`   ❌ Failed to update ${donation.id}:`, updateError);
            } else {
              updates.push({
                id: donation.id,
                oldAmount: donation.amount_charged,
                newAmount: actualCharged,
                actualCharged: actualCharged
              });

              // Also update corresponding receipt if exists
              const { error: receiptError } = await supabaseAdmin
                .from('sponsorship_receipts')
                .update({ amount: actualCharged })
                .eq('transaction_id', matchingCharge.id);

              if (receiptError) {
                console.log(`   ⚠️ No receipt found or failed to update receipt`);
              } else {
                console.log(`   ✅ Receipt updated`);
              }
            }
          } else {
            console.log(`   ✅ Amount already correct ($${actualCharged})`);
          }
        } else {
          console.log(`   ⚠️ No matching charge found for this donation`);
        }
      } catch (error) {
        console.error(`❌ Error processing donation ${donation.id}:`, error);
      }
    }

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
    console.error('Error recalculating donation amounts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
