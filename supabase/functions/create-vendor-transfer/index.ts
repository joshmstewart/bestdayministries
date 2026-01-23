import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[create-vendor-transfer] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderItemId } = await req.json();

    if (!orderItemId) {
      throw new Error('Missing required field: orderItemId');
    }

    logStep('Processing transfer for order item', { orderItemId });

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order item with vendor info
    const { data: orderItem, error: itemError } = await supabaseClient
      .from('order_items')
      .select(`
        id,
        vendor_id,
        vendor_payout,
        fulfillment_status,
        stripe_transfer_id,
        order_id,
        orders!inner(stripe_mode, stripe_payment_intent_id)
      `)
      .eq('id', orderItemId)
      .single();

    if (itemError) {
      logStep('Error fetching order item', { error: itemError });
      throw new Error(`Failed to fetch order item: ${itemError.message}`);
    }

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    logStep('Order item found', { 
      vendorId: orderItem.vendor_id, 
      vendorPayout: orderItem.vendor_payout,
      fulfillmentStatus: orderItem.fulfillment_status,
      existingTransferId: orderItem.stripe_transfer_id
    });

    // Skip if already transferred
    if (orderItem.stripe_transfer_id) {
      logStep('Transfer already exists, skipping', { transferId: orderItem.stripe_transfer_id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfer already completed',
          transferId: orderItem.stripe_transfer_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verify item is shipped
    if (orderItem.fulfillment_status !== 'shipped' && orderItem.fulfillment_status !== 'delivered') {
      throw new Error(`Cannot transfer: item status is "${orderItem.fulfillment_status}", must be shipped or delivered`);
    }

    // Get vendor's Stripe account
    const { data: vendor, error: vendorError } = await supabaseClient
      .from('vendors')
      .select('id, stripe_account_id, stripe_charges_enabled, business_name')
      .eq('id', orderItem.vendor_id)
      .single();

    if (vendorError || !vendor) {
      logStep('Error fetching vendor', { error: vendorError });
      throw new Error('Vendor not found');
    }

    if (!vendor.stripe_account_id) {
      throw new Error(`Vendor ${vendor.business_name} has not connected their Stripe account`);
    }

    if (!vendor.stripe_charges_enabled) {
      throw new Error(`Vendor ${vendor.business_name}'s Stripe account is not fully set up for payouts`);
    }

    logStep('Vendor found', { 
      vendorId: vendor.id, 
      stripeAccountId: vendor.stripe_account_id,
      businessName: vendor.business_name
    });

    // Determine Stripe mode
    const stripeMode = (orderItem.orders as any)?.stripe_mode || 'test';
    const stripeKey = stripeMode === 'live' 
      ? Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_LIVE') 
      : Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_TEST');

    if (!stripeKey) {
      throw new Error(`Stripe secret key not configured for ${stripeMode} mode`);
    }

    logStep('Initializing Stripe', { mode: stripeMode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate transfer amount in cents
    const transferAmountCents = Math.round(orderItem.vendor_payout * 100);

    if (transferAmountCents <= 0) {
      throw new Error('Invalid transfer amount');
    }

    logStep('Creating transfer', { 
      amount: transferAmountCents, 
      destination: vendor.stripe_account_id 
    });

    // Create the transfer
    const transfer = await stripe.transfers.create({
      amount: transferAmountCents,
      currency: 'usd',
      destination: vendor.stripe_account_id,
      transfer_group: `order_${orderItem.order_id}`,
      metadata: {
        order_item_id: orderItemId,
        order_id: orderItem.order_id,
        vendor_id: vendor.id,
        vendor_name: vendor.business_name,
      },
    });

    logStep('Transfer created successfully', { transferId: transfer.id });

    // Update order item with transfer ID
    const { error: updateError } = await supabaseClient
      .from('order_items')
      .update({ stripe_transfer_id: transfer.id })
      .eq('id', orderItemId);

    if (updateError) {
      logStep('Warning: failed to update order item with transfer ID', { error: updateError });
      // Don't throw - transfer already happened
    }

    logStep('Order item updated with transfer ID');

    return new Response(
      JSON.stringify({ 
        success: true, 
        transferId: transfer.id,
        amount: orderItem.vendor_payout,
        vendorName: vendor.business_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[create-vendor-transfer] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
