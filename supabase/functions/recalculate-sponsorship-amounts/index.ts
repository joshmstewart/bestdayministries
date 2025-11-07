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

    // Get all sponsorships
    const { data: sponsorships, error: sponsorshipsError } = await supabaseAdmin
      .from('sponsorships')
      .select('id, amount, stripe_subscription_id, stripe_mode')
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

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
        
        // Check metadata for coverStripeFee and baseAmount
        const coverStripeFee = subscription.metadata?.coverStripeFee === 'true';
        const baseAmount = subscription.metadata?.baseAmount ? parseFloat(subscription.metadata.baseAmount) : null;
        const metadataAmount = subscription.metadata?.amount ? parseFloat(subscription.metadata.amount) : null;

        console.log(`Sponsorship ${sponsorship.id}:`, {
          currentAmount: sponsorship.amount,
          coverStripeFee,
          baseAmount,
          metadataAmount
        });

        // CRITICAL: If coverStripeFee was true, the metadataAmount is the BASE amount
        // We need to calculate UP to the full amount, not use metadata directly
        if (coverStripeFee && metadataAmount) {
          // Calculate the FULL amount from the base amount stored in metadata
          const fullAmount = (metadataAmount + 0.30) / 0.971;
          
          // Only update if the stored amount doesn't match the full amount
          if (Math.abs(sponsorship.amount - fullAmount) > 0.01) {
            console.log(`💰 UPGRADING sponsorship ${sponsorship.id}: $${sponsorship.amount} → $${fullAmount.toFixed(2)} (base: $${metadataAmount})`);
            
            const { error: updateError } = await supabaseAdmin
              .from('sponsorships')
              .update({ amount: fullAmount })
              .eq('id', sponsorship.id);

            if (updateError) {
              console.error(`Failed to update ${sponsorship.id}:`, updateError);
            } else {
              updates.push({
                id: sponsorship.id,
                oldAmount: sponsorship.amount,
                newAmount: parseFloat(fullAmount.toFixed(2))
              });
            }
          }
        } else if (!coverStripeFee && metadataAmount && Math.abs(sponsorship.amount - metadataAmount) > 0.01) {
          // If fees NOT covered, metadata amount IS the correct amount
          console.log(`💰 Correcting sponsorship ${sponsorship.id} (no fee coverage): $${sponsorship.amount} → $${metadataAmount.toFixed(2)}`);
          
          const { error: updateError } = await supabaseAdmin
            .from('sponsorships')
            .update({ amount: metadataAmount })
            .eq('id', sponsorship.id);

          if (updateError) {
            console.error(`Failed to update ${sponsorship.id}:`, updateError);
          } else {
            updates.push({
              id: sponsorship.id,
              oldAmount: sponsorship.amount,
              newAmount: metadataAmount
            });
          }
        }
      } catch (error) {
        console.error(`Error processing sponsorship ${sponsorship.id}:`, error);
      }
    }

    // Also update receipts to match
    for (const update of updates) {
      const { error: receiptError } = await supabaseAdmin
        .from('sponsorship_receipts')
        .update({ amount: update.newAmount })
        .eq('sponsorship_id', update.id);

      if (receiptError) {
        console.error(`Failed to update receipt for ${update.id}:`, receiptError);
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
