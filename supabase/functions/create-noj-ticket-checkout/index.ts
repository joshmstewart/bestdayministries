import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TIER_LABELS: Record<string, string> = {
  'general': 'General Admission (13+)',
  'kids': 'Kids (6–12)',
  'bestie': 'Besties',
  'little-ones': 'Little Ones (5 & under)',
};

const ticketItemSchema = z.object({
  tier: z.enum(['general', 'kids', 'bestie', 'little-ones']),
  quantity: z.number().int().min(1).max(10),
  unit_price: z.number().min(0).max(100),
});

const requestSchema = z.object({
  ticket_items: z.array(ticketItemSchema).min(1).max(4),
  email: z.string().email().max(255).toLowerCase().trim(),
  contact_name: z.string().max(255).optional(),
  cover_stripe_fee: z.boolean().optional().default(false),
});

serve(async (req) => {
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
    const validationResult = requestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    const { ticket_items, email, contact_name, cover_stripe_fee } = validationResult.data;

    // ===== Enforce ticket cap (default 280) =====
    const requestedQty = ticket_items.reduce((s, i) => s + i.quantity, 0);

    const [{ data: capSetting }, { data: existingRows }] = await Promise.all([
      supabaseAdmin.from('app_settings').select('setting_value').eq('setting_key', 'noj_ticket_cap').maybeSingle(),
      supabaseAdmin
        .from('donations')
        .select('designation, status, stripe_mode')
        .like('designation', 'A Night of Joy%'),
    ]);

    let cap = 280;
    const cv = capSetting?.setting_value as any;
    if (typeof cv === 'number') cap = cv;
    else if (typeof cv === 'string') cap = parseInt(cv, 10) || 280;
    else if (cv && typeof cv === 'object' && 'cap' in cv) cap = Number(cv.cap) || 280;

    const sponsorTierTickets = (d: string): number => {
      if (/Best Day Ever Sponsor[^$]*\$10[,]?000/i.test(d)) return 8;
      if (/Best Day Ever Sponsor[^$]*\$5[,]?000/i.test(d)) return 6;
      if (/Bestie Champion[^$]*\$2[,]?500/i.test(d)) return 4;
      if (/Joy Builder[^$]*\$1[,]?000/i.test(d)) return 2;
      return 0;
    };
    const ticketsFromDesignation = (designation: string | null): number => {
      if (!designation) return 0;
      const d = designation.replace(/A Night of Joy\s*[–-]\s*/i, '');
      const paid = [...d.matchAll(/(\d+)\s*×/g)];
      if (paid.length > 0) return paid.reduce((s, m) => s + parseInt(m[1], 10), 0);
      const free = d.match(/×\s*(\d+)/);
      if (free) return parseInt(free[1], 10);
      return sponsorTierTickets(d);
    };
    const claimed = (existingRows || []).reduce((sum, r: any) => {
      if (r.stripe_mode === 'test') return sum;
      if (r.status !== 'completed' && r.status !== 'active') return sum;
      return sum + ticketsFromDesignation(r.designation);
    }, 0);
    const remaining = Math.max(0, cap - claimed);

    if (requestedQty > remaining) {
      return new Response(
        JSON.stringify({
          error: remaining === 0
            ? 'Sorry, A Night of Joy is sold out.'
            : `Only ${remaining} ticket${remaining === 1 ? '' : 's'} remaining. Please reduce your quantity.`,
          remaining,
          cap,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Separate free and paid items
    const freeItems = ticket_items.filter(i => i.unit_price === 0);
    const paidItems = ticket_items.filter(i => i.unit_price > 0);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    const donorId = profile?.id ?? null;
    const donorEmail = profile ? null : email;

    // Record free tickets directly as completed donations
    for (const item of freeItems) {
      const tierLabel = TIER_LABELS[item.tier] || item.tier;
      const { error: insertError } = await supabaseAdmin.from("donations").insert({
        donor_id: donorId,
        donor_email: donorEmail,
        contact_name: contact_name || null,
        amount: 0,
        amount_charged: 0,
        frequency: 'one-time',
        status: 'completed',
        started_at: new Date().toISOString(),
        stripe_mode: 'live',
        designation: `A Night of Joy – ${tierLabel}${item.quantity > 1 ? ` (×${item.quantity})` : ''}`,
      });
      if (insertError) {
        console.error('Failed to create free ticket record:', insertError);
      } else {
        console.log('Free ticket registered:', { tier: tierLabel, quantity: item.quantity, email });
      }
    }

    // If there are NO paid items, send the branded confirmation email now
    // for the free tickets. (Paid tickets get the email after Stripe success.)
    if (paidItems.length === 0 && freeItems.length > 0) {
      try {
        const sendUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-noj-confirmation-email`;
        const ticket_items = freeItems.map(i => ({
          label: TIER_LABELS[i.tier] || i.tier,
          quantity: i.quantity,
          unit_price: 0,
        }));
        const idempotencyKey = `noj-free-${email}-${Date.now()}`;
        fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            email,
            contact_name,
            ticket_items,
            total_amount: 0,
            idempotency_key: idempotencyKey,
          }),
        }).catch(err => console.error('Failed to send NOJ free-ticket confirmation:', err));
      } catch (e) {
        console.error('Error triggering NOJ free-ticket email:', e);
      }
    }

    // Build tier summary for notifications
    const allTierSummary = ticket_items
      .map(i => `${i.quantity}× ${TIER_LABELS[i.tier] || i.tier}`)
      .join(', ');
    const totalBaseAmount = ticket_items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    // For admin notification, show what will actually be charged (including fee if applicable)
    const totalAmount = cover_stripe_fee && totalBaseAmount > 0
      ? Math.round(((totalBaseAmount + 0.30) / 0.971) * 100) / 100
      : totalBaseAmount;

    // Notify admins of ticket purchase (fire-and-forget)
    try {
      const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admin-noj-activity`;
      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: 'ticket_purchase',
          email,
          contact_name: contact_name || undefined,
          tier_summary: allTierSummary,
          total_amount: totalAmount,
          is_free: paidItems.length === 0,
        }),
      }).catch(err => console.error('Failed to notify admins:', err));
    } catch (e) {
      console.error('Error triggering admin notification:', e);
    }

    // If only free tickets, return success immediately
    if (paidItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, free: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Paid tickets — use Stripe checkout
    const { data: modeSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_mode')
      .single();
    const mode = modeSetting?.setting_value || 'test';

    const stripeKey = mode === 'live'
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');

    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Create or get customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: contact_name || undefined,
      });
    }

    // Build Stripe line items for each paid tier
    const lineItems = paidItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `A Night of Joy – ${TIER_LABELS[item.tier] || item.tier}`,
          description: 'Event ticket for A Night of Joy fundraiser by Best Day Ministries',
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    const totalPaidAmount = paidItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

    // Calculate fee-covered total
    const finalChargeAmount = cover_stripe_fee
      ? Math.round(((totalPaidAmount + 0.30) / 0.971) * 100) / 100
      : totalPaidAmount;
    const feeAmount = +(finalChargeAmount - totalPaidAmount).toFixed(2);

    // Add processing fee as a separate line item if covering fees
    if (cover_stripe_fee && feeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Processing Fee',
            description: 'Covers Stripe processing so 100% of your ticket price supports Best Day Ministries',
          },
          unit_amount: Math.round(feeAmount * 100),
        },
        quantity: 1,
      });
    }

    const totalAllQty = ticket_items.reduce((sum, i) => sum + i.quantity, 0);

    // Build a human-readable designation
    const tierSummary = ticket_items
      .map(i => `${i.quantity}× ${TIER_LABELS[i.tier] || i.tier}`)
      .join(', ');

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/night-of-joy?payment=success&type=ticket`,
      cancel_url: `${req.headers.get('origin')}/night-of-joy`,
      metadata: {
        type: 'donation',
        donation_type: 'night-of-joy-ticket',
        frequency: 'one-time',
        amount: totalPaidAmount.toString(),
        source: 'night-of-joy',
        tier_name: `A Night of Joy – Event Tickets (${tierSummary})`,
        contact_name: contact_name || '',
        quantity: totalAllQty.toString(),
        ticket_items: JSON.stringify(ticket_items),
      },
    });

    console.log('Night of Joy ticket checkout created:', session.id, { tierSummary, totalPaidAmount });

    // Create pending donation record for the paid portion
    const { error: insertError } = await supabaseAdmin.from("donations").insert({
      donor_id: donorId,
      donor_email: donorEmail,
      contact_name: contact_name || null,
      amount: totalPaidAmount,
      amount_charged: finalChargeAmount,
      frequency: 'one-time',
      status: 'pending',
      started_at: new Date().toISOString(),
      stripe_mode: mode,
      stripe_customer_id: customer.id,
      stripe_checkout_session_id: session.id,
      designation: `A Night of Joy – Event Tickets (${tierSummary})`,
    });

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
    } else {
      console.log('Pending donation record created for NOJ tickets');
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-noj-ticket-checkout:', error instanceof Error ? error.message : error);
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Failed to create checkout session. Please try again.';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
