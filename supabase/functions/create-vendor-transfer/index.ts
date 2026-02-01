import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { SENDERS, SITE_URL } from "../_shared/domainConstants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[create-vendor-transfer] ${step}${detailsStr}`);
};

// Send payout notification email to vendor
async function sendPayoutNotificationEmail(
  vendorEmail: string,
  vendorName: string,
  amount: number,
  orderId: string
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    logStep('Warning: RESEND_API_KEY not configured, skipping payout email');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    
    await resend.emails.send({
      from: SENDERS.store,
      to: [vendorEmail],
      subject: `💰 You've been paid $${amount.toFixed(2)}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Payment Received! 🎉</h1>
          
          <p>Hi ${vendorName},</p>
          
          <p>Great news! A payout of <strong>$${amount.toFixed(2)}</strong> has been sent to your connected Stripe account.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0 0;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          </div>
          
          <p>The funds should appear in your bank account within 2-3 business days, depending on your payout schedule.</p>
          
          <p>You can view your earnings and order history in your <a href="${SITE_URL}/vendor-dashboard" style="color: #f97316;">Vendor Dashboard</a>.</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for being part of the Joy House Store!<br>
            - The Best Day Ministries Team
          </p>
        </div>
      `,
    });

    logStep('Payout notification email sent', { vendorEmail, amount });
  } catch (emailError) {
    logStep('Warning: Failed to send payout email', { error: emailError });
    // Don't throw - email failure shouldn't block the payout process
  }
}

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
        transfer_status,
        transfer_attempts,
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
      transferStatus: orderItem.transfer_status,
      existingTransferId: orderItem.stripe_transfer_id
    });

    // Skip if already transferred
    if (orderItem.stripe_transfer_id || orderItem.transfer_status === 'transferred') {
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

    // Get vendor's Stripe account and email for notification
    const { data: vendor, error: vendorError } = await supabaseClient
      .from('vendors')
      .select('id, stripe_account_id, stripe_charges_enabled, business_name, user_id')
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

    // Get vendor's email from their profile
    let vendorEmail: string | null = null;
    if (vendor.user_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('email')
        .eq('id', vendor.user_id)
        .single();
      vendorEmail = profile?.email || null;
    }

    logStep('Vendor found', { 
      vendorId: vendor.id, 
      stripeAccountId: vendor.stripe_account_id,
      businessName: vendor.business_name,
      hasEmail: !!vendorEmail
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

    // Check platform balance before attempting transfer
    try {
      const balance = await stripe.balance.retrieve();
      const availableUsd = balance.available.find((b: { currency: string; amount: number }) => b.currency === 'usd');
      const availableAmount = availableUsd?.amount || 0;

      logStep('Platform balance check', { 
        availableAmount, 
        requiredAmount: transferAmountCents 
      });

      if (availableAmount < transferAmountCents) {
        // Insufficient funds - mark as pending_funds and queue for retry
        logStep('Insufficient funds, marking as pending_funds');
        
        await supabaseClient
          .from('order_items')
          .update({ 
            transfer_status: 'pending_funds',
            transfer_error_message: `Waiting for funds to settle. Available: $${(availableAmount / 100).toFixed(2)}, Required: $${(transferAmountCents / 100).toFixed(2)}`,
            transfer_attempts: (orderItem.transfer_attempts || 0) + 1,
            last_transfer_attempt: new Date().toISOString()
          })
          .eq('id', orderItemId);

        return new Response(
          JSON.stringify({ 
            success: false,
            pending_funds: true,
            message: 'Transfer queued - waiting for customer payment to settle (2-3 business days)',
            availableBalance: availableAmount / 100,
            requiredAmount: transferAmountCents / 100
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (balanceError) {
      logStep('Warning: could not check balance, proceeding with transfer attempt', { error: balanceError });
      // Continue with transfer attempt - Stripe will reject if insufficient
    }

    logStep('Creating transfer', { 
      amount: transferAmountCents, 
      destination: vendor.stripe_account_id 
    });

    // Create the transfer
    try {
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

      // Update order item with transfer ID and status
      const { error: updateError } = await supabaseClient
        .from('order_items')
        .update({ 
          stripe_transfer_id: transfer.id,
          transfer_status: 'transferred',
          transfer_error_message: null,
          last_transfer_attempt: new Date().toISOString()
        })
        .eq('id', orderItemId);

      if (updateError) {
        logStep('Warning: failed to update order item with transfer ID', { error: updateError });
      }

      logStep('Order item updated with transfer ID');

      // Send payout notification email to vendor
      if (vendorEmail) {
        await sendPayoutNotificationEmail(
          vendorEmail,
          vendor.business_name,
          orderItem.vendor_payout,
          orderItem.order_id
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          transferId: transfer.id,
          amount: orderItem.vendor_payout,
          vendorName: vendor.business_name,
          emailSent: !!vendorEmail
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (transferError: any) {
      // Check if it's an insufficient funds error
      if (transferError.code === 'balance_insufficient' || 
          transferError.message?.includes('insufficient') ||
          transferError.message?.includes('balance')) {
        
        logStep('Transfer failed due to insufficient funds', { error: transferError.message });
        
        await supabaseClient
          .from('order_items')
          .update({ 
            transfer_status: 'pending_funds',
            transfer_error_message: 'Waiting for customer payment to settle (2-3 business days)',
            transfer_attempts: (orderItem.transfer_attempts || 0) + 1,
            last_transfer_attempt: new Date().toISOString()
          })
          .eq('id', orderItemId);

        return new Response(
          JSON.stringify({ 
            success: false,
            pending_funds: true,
            message: 'Transfer queued - waiting for funds to settle'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Other transfer errors
      await supabaseClient
        .from('order_items')
        .update({ 
          transfer_status: 'failed',
          transfer_error_message: transferError.message || 'Unknown transfer error',
          transfer_attempts: (orderItem.transfer_attempts || 0) + 1,
          last_transfer_attempt: new Date().toISOString()
        })
        .eq('id', orderItemId);

      throw transferError;
    }

  } catch (error) {
    console.error('[create-vendor-transfer] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
