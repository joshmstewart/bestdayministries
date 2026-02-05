import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation schema
const donationSchema = z.object({
  amount: z.number()
    .min(5, "Minimum donation is $5")
    .max(100000, "Maximum donation is $100,000")
    .finite("Amount must be a valid number"),
  frequency: z.enum(['monthly', 'one-time'], {
    errorMap: () => ({ message: "Frequency must be 'monthly' or 'one-time'" })
  }),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),
  coverStripeFee: z.boolean().optional().default(false),
  subscribeNewsletter: z.boolean().optional().default(false),
  force_test_mode: z.boolean().optional().default(false)
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();

    // Validate inputs with Zod
    const validationResult = donationSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation error:', errors);
      throw new Error(`Validation failed: ${errors}`);
    }

    const { force_test_mode } = validationResult.data;

    // Get Stripe mode from app_settings (unless force_test_mode is true)
    let mode = 'test';
    if (!force_test_mode) {
      const { data: modeSetting } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'stripe_mode')
        .single();
      mode = modeSetting?.setting_value || 'test';
    }
    
    const stripeKey = mode === 'live' 
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');
    
    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const { amount, frequency, email, coverStripeFee, subscribeNewsletter } = validationResult.data;

    // Calculate final amount including Stripe fee if user chose to cover it
    let finalAmount = amount;
    if (coverStripeFee) {
      finalAmount = (amount + 0.30) / 0.971;
    }

    // Sanitize for logging
    const sanitizedEmail = email.substring(0, 3) + '***@' + email.split('@')[1];
    console.log('Creating donation checkout:', { 
      amount, 
      finalAmount,
      coverStripeFee,
      frequency, 
      email: sanitizedEmail 
    });

    const amountInCents = Math.round(finalAmount * 100);

    // Create or get customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
      });
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Donation to Best Day Ever Ministries`,
              description: frequency === 'monthly' 
                ? 'Monthly donation to support Best Day Ever Ministries'
                : 'One-time donation to support Best Day Ever Ministries',
            },
            unit_amount: amountInCents,
            ...(frequency === 'monthly' && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: frequency === 'monthly' ? 'subscription' : 'payment',
      success_url: `${req.headers.get('origin')}/support?donation=success`,
      cancel_url: `${req.headers.get('origin')}/support`,
      metadata: {
        type: 'donation',
        frequency,
        amount: amount.toString(),
        coverStripeFee: coverStripeFee.toString(),
        donation_type: 'general',
      },
      ...(frequency === 'monthly' && {
        subscription_data: {
          metadata: {
            type: 'donation',
            frequency,
            amount: amount.toString(),
            coverStripeFee: coverStripeFee.toString(),
            donation_type: 'general',
          },
        },
      }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Donation checkout session created:', session.id);

    // Check for existing pending donation with this session ID to prevent duplicates
    const { data: existingDonation } = await supabaseAdmin
      .from("donations")
      .select("id")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();

    if (existingDonation) {
      console.log('⚠️ Session already has a donation record, reusing:', session.id);
      return new Response(
        JSON.stringify({ url: session.url }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create the donation record immediately (status will be updated by webhook)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    console.log('Profile lookup:', { 
      email: sanitizedEmail, 
      foundProfile: !!profile, 
      profileId: profile?.id || 'none' 
    });

    // RESPECT donor_identifier_check CONSTRAINT:
    // For users with existing profiles: set donor_id ONLY (email retrieved from profiles table for receipts)
    // For guests (no profile): set donor_email ONLY
    // NEVER both, NEVER neither
    const donorId = profile?.id ?? null;
    const donorEmail = profile ? null : email;  // Only set email for guests

    console.log('Donor identification:', { 
      donorId: donorId || 'null', 
      donorEmail: donorEmail ? sanitizedEmail : 'null',
      constraint: `donor_id=${donorId ? 'SET' : 'NULL'}, donor_email=${donorEmail ? 'SET' : 'NULL'}`
    });

    const donationPayload = {
      donor_id: donorId,
      donor_email: donorEmail,
      amount: amount,                      // Base amount without fees
      amount_charged: finalAmount,         // Full amount including fees if covered
      frequency: frequency,
      status: 'pending',
      started_at: new Date().toISOString(),
      stripe_mode: mode,
      stripe_customer_id: customer.id,
      stripe_checkout_session_id: session.id,  // Store session ID for unique matching
    };

    console.log('Donation insert payload:', {
      donor_id: donationPayload.donor_id || 'NULL',
      donor_email: donationPayload.donor_email || 'NULL',
      amount: donationPayload.amount,
      amount_charged: donationPayload.amount_charged,
      frequency: donationPayload.frequency,
      status: donationPayload.status,
      stripe_mode: donationPayload.stripe_mode,
      stripe_customer_id: donationPayload.stripe_customer_id
    });

    const { error: insertError } = await supabaseAdmin.from("donations").insert(donationPayload);

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
      
      // Flag donor_identifier_check violations explicitly
      if (insertError.code === '23514' && insertError.message?.includes('donor_identifier_check')) {
        console.error('🚨 CONSTRAINT VIOLATION: donor_identifier_check - both donor_id and donor_email were set or both were null');
      }
      
      throw new Error(`Failed to create donation record: ${insertError.message}`);
    }

    // Subscribe to newsletter if opted in
    if (subscribeNewsletter) {
      try {
        // Check if already subscribed
        const { data: existingSubscriber } = await supabaseAdmin
          .from('newsletter_subscribers')
          .select('id, status')
          .eq('email', email)
          .maybeSingle();

        if (existingSubscriber) {
          // Reactivate if unsubscribed
          if (existingSubscriber.status !== 'active') {
            await supabaseAdmin
              .from('newsletter_subscribers')
              .update({ 
                status: 'active', 
                unsubscribed_at: null,
                user_id: profile?.id || null
              })
              .eq('id', existingSubscriber.id);
            console.log('Newsletter subscription reactivated for:', sanitizedEmail);
          }
        } else {
          // Create new subscription
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await supabaseAdmin
            .from('newsletter_subscribers')
            .insert({
              email: email,
              user_id: profile?.id || null,
              status: 'active',
              timezone: timezone,
              source: 'donation_form',
            });
          console.log('Newsletter subscription created for:', sanitizedEmail);

          // Trigger welcome email
          try {
            const functionsUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.functions.supabase.co');
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-automated-campaign`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                trigger_event: 'newsletter_signup',
                recipient_email: email,
                recipient_user_id: profile?.id || null,
                trigger_data: {
                  source: 'donation_form',
                },
              }),
            });
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the donation for email errors
          }
        }
      } catch (newsletterError) {
        console.error('Newsletter subscription error:', newsletterError);
        // Don't fail the donation for newsletter errors
      }
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-donation-checkout:', {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Failed to create checkout session. Please try again.';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
