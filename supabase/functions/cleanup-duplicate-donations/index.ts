import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CleanupResult {
  donationId: string;
  action: 'kept_active' | 'marked_duplicate';
  stripeId: string;
  stripeType: 'subscription' | 'payment_intent';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CLEANUP-DUPLICATES] Function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner']);

    if (!roles || roles.length === 0) {
      throw new Error('Admin access required');
    }

    console.log('[CLEANUP-DUPLICATES] Admin authenticated:', user.id);

    // Get all donations with Stripe IDs
    const { data: donations, error: fetchError } = await supabase
      .from('donations')
      .select('*')
      .or('stripe_subscription_id.not.is.null,stripe_payment_intent_id.not.is.null')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch donations: ${fetchError.message}`);
    }

    console.log('[CLEANUP-DUPLICATES] Found donations with Stripe IDs:', donations?.length || 0);

    const results: CleanupResult[] = [];
    const processedStripeIds = new Set<string>();

    // Group by subscription ID
    const bySubscription = new Map<string, typeof donations>();
    const byPaymentIntent = new Map<string, typeof donations>();

    for (const donation of donations || []) {
      if (donation.stripe_subscription_id) {
        const existing = bySubscription.get(donation.stripe_subscription_id) || [];
        existing.push(donation);
        bySubscription.set(donation.stripe_subscription_id, existing);
      }
      if (donation.stripe_payment_intent_id) {
        const existing = byPaymentIntent.get(donation.stripe_payment_intent_id) || [];
        existing.push(donation);
        byPaymentIntent.set(donation.stripe_payment_intent_id, existing);
      }
    }

    console.log('[CLEANUP-DUPLICATES] Groups - Subscriptions:', bySubscription.size, 'Payment Intents:', byPaymentIntent.size);

    // Process subscription groups
    for (const [subId, group] of bySubscription.entries()) {
      if (group.length > 1) {
        console.log(`[CLEANUP-DUPLICATES] Found ${group.length} donations for subscription ${subId}`);
        
        // Keep the first one (earliest created_at), mark rest as duplicate
        const [primary, ...duplicates] = group;
        
        // Mark primary as active if not already
        if (primary.status !== 'active' && primary.status !== 'completed') {
          await supabase
            .from('donations')
            .update({ status: 'active' })
            .eq('id', primary.id);
          
          results.push({
            donationId: primary.id,
            action: 'kept_active',
            stripeId: subId,
            stripeType: 'subscription'
          });
        }

        // Mark duplicates
        for (const dup of duplicates) {
          await supabase
            .from('donations')
            .update({ status: 'duplicate' })
            .eq('id', dup.id);
          
          results.push({
            donationId: dup.id,
            action: 'marked_duplicate',
            stripeId: subId,
            stripeType: 'subscription'
          });
        }
      }
    }

    // Process payment intent groups
    for (const [piId, group] of byPaymentIntent.entries()) {
      if (group.length > 1) {
        console.log(`[CLEANUP-DUPLICATES] Found ${group.length} donations for payment intent ${piId}`);
        
        // Keep the first one, mark rest as duplicate
        const [primary, ...duplicates] = group;
        
        // Mark primary as completed if not already
        if (primary.status !== 'active' && primary.status !== 'completed') {
          await supabase
            .from('donations')
            .update({ status: 'completed' })
            .eq('id', primary.id);
          
          results.push({
            donationId: primary.id,
            action: 'kept_active',
            stripeId: piId,
            stripeType: 'payment_intent'
          });
        }

        // Mark duplicates
        for (const dup of duplicates) {
          await supabase
            .from('donations')
            .update({ status: 'duplicate' })
            .eq('id', dup.id);
          
          results.push({
            donationId: dup.id,
            action: 'marked_duplicate',
            stripeId: piId,
            stripeType: 'payment_intent'
          });
        }
      }
    }

    const summary = {
      totalProcessed: results.length,
      keptActive: results.filter(r => r.action === 'kept_active').length,
      markedDuplicate: results.filter(r => r.action === 'marked_duplicate').length
    };

    console.log('[CLEANUP-DUPLICATES] Cleanup complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[CLEANUP-DUPLICATES] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
