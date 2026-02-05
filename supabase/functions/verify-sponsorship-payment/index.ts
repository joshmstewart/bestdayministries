import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation schema for payment verification request
const verifyPaymentSchema = z.object({
  session_id: z.string()
    .min(1, "Session ID is required")
    .regex(/^cs_/, "Invalid Stripe session ID format")
    .max(255, "Session ID too long"),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData = await req.json();
    
    // Validate request data
    const validationResult = verifyPaymentSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      console.error('Invalid payment verification request:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const { session_id } = validationResult.data;
    
    console.log('Verifying sponsorship payment for session:', session_id);
    
    // Use database INSERT as a distributed lock - try to claim this transaction first
    // This prevents race conditions where multiple instances check "no receipt exists" simultaneously
    const { data: placeholderReceipt, error: placeholderError } = await supabaseAdmin
      .from('sponsorship_receipts')
      .insert({
        transaction_id: session_id,
        sponsor_email: 'pending@processing.temp', // Temporary placeholder
        sponsor_name: 'Processing',
        bestie_name: 'Processing',
        amount: 0,
        frequency: 'monthly',
        transaction_date: new Date().toISOString(),
        receipt_number: `PENDING-${session_id}`,
        tax_year: new Date().getFullYear(),
        stripe_mode: session_id.startsWith('cs_test_') ? 'test' : 'live',
      })
      .select('id')
      .single();
    
    // If INSERT fails with unique constraint, another instance already claimed this transaction
    if (placeholderError) {
      if (placeholderError.code === '23505') {
        console.log('Transaction already being processed by another instance:', session_id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Already processing',
            alreadyProcessed: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        console.error('Unexpected error creating placeholder receipt:', placeholderError);
        throw new Error('Failed to claim transaction');
      }
    }
    
    console.log('Transaction claimed successfully, placeholder receipt created:', placeholderReceipt.id);
    
    // Detect mode from session ID prefix instead of app_settings
    // This allows test payments to work even when app is in live mode
    const isTestSession = session_id.startsWith('cs_test_');
    const mode = isTestSession ? 'test' : 'live';
    console.log('Detected session mode from prefix:', mode);
    
    const stripeKey = mode === 'live'
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');
    
    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Get customer email from session
    const customerEmail = session.customer_details?.email || session.customer_email;
    if (!customerEmail) {
      throw new Error('No customer email in session');
    }

    // Find user by email using auth.admin
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
    const userId = user?.id || null;

    // Check if sponsorship already exists by sponsor + bestie (handles both webhook and direct creation)
    const sponsorBestieId = session.metadata.bestie_id;
    
    if (userId && sponsorBestieId) {
      const { data: existingByUser } = await supabaseAdmin
        .from('sponsorships')
        .select('id, amount, frequency, stripe_subscription_id')
        .eq('sponsor_id', userId)
        .eq('sponsor_bestie_id', sponsorBestieId)
        .maybeSingle();

      if (existingByUser) {
        console.log('Sponsorship already exists for this user+bestie:', existingByUser.id);
        
        // Update stripe_subscription_id if it's missing (edge case)
        const stripeReferenceId = session.subscription || session.payment_intent;
        if (stripeReferenceId && !existingByUser.stripe_subscription_id) {
          await supabaseAdmin
            .from('sponsorships')
            .update({ stripe_subscription_id: stripeReferenceId })
            .eq('id', existingByUser.id);
          console.log('Updated missing stripe_subscription_id');
        }
        
        return new Response(
          JSON.stringify({ 
            success: true,
            sponsorship_id: existingByUser.id,
            amount: existingByUser.amount,
            frequency: existingByUser.frequency,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Create or update sponsorship record using upsert to avoid race condition with webhook
    const stripeReferenceId = session.subscription || session.payment_intent;
    const startedAt = new Date();
    const endedAt = session.metadata.frequency === 'one-time' 
      ? new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000) // One-time sponsorships expire after 1 month
      : null;
    
    // CRITICAL: Use the FULL amount from metadata (includes Stripe fees if covered)
    // This is the total amount we actually receive from the sponsor
    const fullAmount = parseFloat(session.metadata.amount);
    console.log('💰 Creating sponsorship with FULL amount received:', fullAmount);
    
    // Get bestie_id before creating sponsorship
    const { data: sponsorBestieData } = await supabaseAdmin
      .from('sponsor_besties')
      .select('bestie_id')
      .eq('id', sponsorBestieId)
      .single();
    
    const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
      .from('sponsorships')
      .upsert({
        sponsor_id: userId,
        sponsor_email: userId ? null : customerEmail, // Store email for guest checkouts
        sponsor_bestie_id: sponsorBestieId,
        bestie_id: sponsorBestieData?.bestie_id || null, // CRITICAL: Populate bestie_id
        amount: fullAmount, // Store FULL amount - this is what we actually receive
        frequency: session.metadata.frequency,
        status: 'active',
        started_at: startedAt.toISOString(),
        ended_at: endedAt?.toISOString() || null,
        stripe_subscription_id: stripeReferenceId || null,
        stripe_customer_id: session.customer as string, // CRITICAL: Populate stripe_customer_id
        stripe_checkout_session_id: session_id, // CRITICAL: Populate checkout session id
        stripe_mode: mode,
      }, {
        // Use stripe_subscription_id for upsert to prevent duplicates for both auth and guest users
        onConflict: stripeReferenceId ? 'stripe_subscription_id' : (userId ? 'sponsor_id,sponsor_bestie_id' : undefined),
      })
      .select()
      .single();

    if (sponsorshipError) {
      console.error('Error creating/updating sponsorship:', sponsorshipError);
      throw new Error('Failed to create sponsorship record');
    }

    console.log('Sponsorship created:', sponsorship.id, userId ? '(authenticated)' : '(guest)');

    // Get bestie details for the receipt and bestie_id
    const { data: bestieData } = await supabaseAdmin
      .from('sponsor_besties')
      .select('bestie_name, bestie_id')
      .eq('id', session.metadata.bestie_id)
      .single();

    if (bestieData) {
      console.log('Updating placeholder receipt with final details for session:', session_id);
      
      // CRITICAL: Use the FULL amount (includes Stripe fees if covered)
      const receiptAmount = parseFloat(session.metadata.amount);
      console.log('💰 Receipt amount (full amount received):', receiptAmount);
      
      // Update the placeholder receipt we created earlier with actual details
      const { error: updateError } = await supabaseAdmin
        .from('sponsorship_receipts')
        .update({
          sponsorship_id: sponsorship.id,
          sponsor_email: customerEmail,
          sponsor_name: customerEmail.split('@')[0],
          bestie_name: bestieData.bestie_name,
          amount: receiptAmount, // FULL amount received
          frequency: session.metadata.frequency,
          transaction_date: new Date().toISOString(),
          receipt_number: `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          user_id: userId,
        })
        .eq('id', placeholderReceipt.id);

      if (updateError) {
        console.error('Error updating receipt record:', updateError);
        // Don't fail the whole transaction if receipt update fails
      } else {
        // Log receipt creation
        await supabaseAdmin.from('receipt_generation_logs').insert({
          sponsorship_id: sponsorship.id,
          receipt_id: placeholderReceipt.id,
          stage: 'verify_payment_receipt_created',
          status: 'success',
          metadata: { session_id: session_id, stripe_mode: mode }
        });

        // Only send email after database update succeeded
        console.log('Receipt record updated, sending email...');
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              sponsorEmail: customerEmail,
              bestieName: bestieData.bestie_name,
              amount: receiptAmount, // FULL amount received
              frequency: session.metadata.frequency,
              transactionId: session_id,
              transactionDate: new Date().toISOString(),
              stripeMode: mode,
            }),
          });
          console.log('Receipt email sent for session:', session_id);

          // Log email sent
          await supabaseAdmin.from('receipt_generation_logs').insert({
            sponsorship_id: sponsorship.id,
            receipt_id: placeholderReceipt.id,
            stage: 'verify_payment_email_sent',
            status: 'success',
            metadata: { session_id: session_id }
          });
        } catch (emailError) {
          console.error('Failed to send receipt email:', emailError);

          // Log email failure
          await supabaseAdmin.from('receipt_generation_logs').insert({
            sponsorship_id: sponsorship.id,
            receipt_id: placeholderReceipt.id,
            stage: 'verify_payment_email_failed',
            status: 'error',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        sponsorship_id: sponsorship.id,
        amount: session.metadata.amount,
        frequency: session.metadata.frequency,
        message: userId ? undefined : 'Your sponsorship will automatically link when you create an account with this email.',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in verify-sponsorship-payment:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
