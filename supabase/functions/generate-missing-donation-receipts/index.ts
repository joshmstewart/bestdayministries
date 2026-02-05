import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const message = details ? `${step}: ${JSON.stringify(details)}` : step;
  console.log(message);
  return message;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const logs: string[] = [];
    const results = {
      pendingDonationsFixed: 0,
      donationsProcessed: 0,
      donationReceiptsCreated: 0,
      sponsorshipsProcessed: 0,
      sponsorshipReceiptsCreated: 0,
      errors: [] as any[],
    };

    // Get organization settings
    const { data: receiptSettings } = await supabaseClient
      .from("receipt_settings")
      .select("*")
      .limit(1)
      .single();

    const orgName = receiptSettings?.organization_name || "Best Day Ministries";
    const orgEin = receiptSettings?.organization_ein || "00-0000000";

    // ============================================
    // PHASE 1: FIX PENDING DONATIONS
    // ============================================
    logs.push(logStep("=== PHASE 1: FIXING PENDING DONATIONS ==="));

    const { data: pendingDonations, error: pendingError } = await supabaseClient
      .from("donations")
      .select("id, donor_id, donor_email, amount, stripe_checkout_session_id, stripe_mode, status")
      .eq("status", "pending")
      .not("stripe_checkout_session_id", "is", null);

    if (pendingError) throw pendingError;

    logs.push(logStep(`Found ${pendingDonations?.length || 0} pending donations with checkout session IDs`));

    if (pendingDonations && pendingDonations.length > 0) {
      const stripeKeyLive = Deno.env.get('STRIPE_SECRET_KEY_LIVE');
      const stripeKeyTest = Deno.env.get('STRIPE_SECRET_KEY_TEST');

      for (const donation of pendingDonations) {
        try {
          const stripeKey = donation.stripe_mode === 'live' ? stripeKeyLive : stripeKeyTest;
          if (!stripeKey) {
            logs.push(logStep(`Skipping donation ${donation.id} - Stripe key not configured for ${donation.stripe_mode} mode`));
            continue;
          }

          const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

          // Retrieve the checkout session from Stripe
          const session = await stripe.checkout.sessions.retrieve(donation.stripe_checkout_session_id);

          logs.push(logStep(`Retrieved session for donation ${donation.id}`, {
            session_id: session.id,
            payment_status: session.payment_status,
            mode: session.mode,
          }));

          let newStatus = "pending";
          let stripePaymentIntentId = null;
          let stripeSubscriptionId = null;

          if (session.payment_status === "paid") {
            if (session.mode === "payment") {
              // One-time payment
              newStatus = "completed";
              stripePaymentIntentId = session.payment_intent as string;
            } else if (session.mode === "subscription") {
              // Recurring subscription
              newStatus = "active";
              stripeSubscriptionId = session.subscription as string;
            }
          } else if (session.payment_status === "unpaid") {
            newStatus = "pending";
          } else {
            newStatus = "cancelled";
          }

          // Update donation with correct status and Stripe IDs
          const { error: updateError } = await supabaseClient
            .from("donations")
            .update({
              status: newStatus,
              stripe_payment_intent_id: stripePaymentIntentId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: session.customer as string,
            })
            .eq("id", donation.id);

          if (updateError) {
            logs.push(logStep(`Failed to update donation ${donation.id}`, updateError));
            results.errors.push({ donation_id: donation.id, error: updateError.message });
            continue;
          }

          results.pendingDonationsFixed++;
          logs.push(logStep(`Fixed donation ${donation.id}: ${donation.status} → ${newStatus}`));

          // Log to reconciliation_changes table
          await supabaseClient
            .from("reconciliation_changes")
            .insert({
              job_type: "fix_pending_donations",
              record_type: "donation",
              record_id: donation.id,
              field_name: "status",
              old_value: donation.status,
              new_value: newStatus,
              change_source: "automated_reconciliation",
              metadata: {
                checkout_session_id: donation.stripe_checkout_session_id,
                payment_status: session.payment_status,
                stripe_payment_intent_id: stripePaymentIntentId,
                stripe_subscription_id: stripeSubscriptionId,
              },
            });

        } catch (error: any) {
          logs.push(logStep(`Error processing pending donation ${donation.id}`, error));
          results.errors.push({ donation_id: donation.id, error: error.message });
        }
      }
    }

    logs.push(logStep(`Phase 1 complete: Fixed ${results.pendingDonationsFixed} pending donations`));

    // ============================================
    // PHASE 2: GENERATE MISSING RECEIPTS
    // ============================================
    logs.push(logStep("=== PHASE 2: SCANNING FOR MISSING DONATION RECEIPTS ==="));

    // Find donations without receipts
    const { data: donations, error: donationsError } = await supabaseClient
      .from("donations")
      .select(`
        id,
        donor_id,
        donor_email,
        amount,
        amount_charged,
        frequency,
        started_at,
        status,
        stripe_subscription_id,
        stripe_payment_intent_id,
        stripe_mode,
        profiles!donations_donor_id_fkey(email, display_name)
      `)
      .in("status", ["active", "completed"]);

    if (donationsError) throw donationsError;

    logs.push(logStep(`Found ${donations?.length || 0} total donations`));

    if (donations && donations.length > 0) {
      const { data: existingReceipts } = await supabaseClient
        .from("sponsorship_receipts")
        .select("transaction_id");

      const existingTransactionIds = new Set(
        existingReceipts?.map(r => r.transaction_id) || []
      );

      const donationsNeedingReceipts = donations.filter(d => {
        const transactionId = `donation_${d.id}`;
        return !existingTransactionIds.has(transactionId);
      });

      logs.push(logStep(`${donationsNeedingReceipts.length} donations missing receipts`));

      for (const donation of donationsNeedingReceipts) {
        try {
          results.donationsProcessed++;

          // Get donor info
          let donorEmail = donation.donor_email;
          let donorName = "Donor";

          if (donation.profiles && Array.isArray(donation.profiles) && donation.profiles[0]) {
            donorEmail = donorEmail || donation.profiles[0].email;
            donorName = donation.profiles[0].display_name || "Donor";
          }

          if (!donorEmail) {
            logs.push(logStep(`Skipping donation ${donation.id} - no email available`));
            results.errors.push({ donation_id: donation.id, error: "No email available" });
            continue;
          }

          const transactionId = `donation_${donation.id}`;
          const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
          const taxYear = new Date(donation.started_at).getFullYear();

          const { data: receipt, error: insertError } = await supabaseClient
            .from("sponsorship_receipts")
            .insert({
              sponsor_email: donorEmail,
              sponsor_name: donorName,
              user_id: donation.donor_id,
              bestie_name: "General Support",
              amount: donation.amount_charged || donation.amount,
              frequency: donation.frequency,
              transaction_id: transactionId,
              transaction_date: donation.started_at,
              stripe_mode: donation.stripe_mode,
              organization_name: orgName,
              organization_ein: orgEin,
              receipt_number: receiptNumber,
              tax_year: taxYear,
            })
            .select()
            .single();

          if (insertError) {
            logs.push(logStep(`Failed to create receipt for donation ${donation.id}`, insertError));
            results.errors.push({ donation_id: donation.id, error: insertError.message });
            continue;
          }

          results.donationReceiptsCreated++;
          logs.push(logStep(`Created receipt for donation ${donation.id} → ${donorEmail}`));

          // Send email
          try {
            await supabaseClient.functions.invoke("send-sponsorship-receipt", {
              body: { receiptId: receipt.id },
            });
            logs.push(logStep(`Sent receipt email to ${donorEmail}`));
          } catch (emailError: any) {
            logs.push(logStep(`Failed to send email for ${donation.id}`, emailError));
          }
        } catch (error: any) {
          logs.push(logStep(`Error processing donation ${donation.id}`, error));
          results.errors.push({ donation_id: donation.id, error: error.message });
        }
      }
    }

    logs.push(logStep("=== SCANNING FOR MISSING SPONSORSHIP RECEIPTS ==="));

    // Find sponsorships with active recurring payments that are missing recent receipts
    const { data: sponsorships, error: sponsorshipsError } = await supabaseClient
      .from("sponsorships")
      .select("id, sponsor_email, sponsor_id, bestie_id, amount, frequency, stripe_mode, stripe_subscription_id, stripe_payment_intent_id, started_at, status, sponsor_besties(bestie_name)")
      .eq("status", "active")
      .eq("frequency", "monthly");

    if (sponsorshipsError) throw sponsorshipsError;

    logs.push(logStep(`Found ${sponsorships?.length || 0} active monthly sponsorships`));

    if (sponsorships && sponsorships.length > 0) {
      // Initialize Stripe clients
      const stripeKeyLive = Deno.env.get('STRIPE_SECRET_KEY_LIVE');
      const stripeKeyTest = Deno.env.get('STRIPE_SECRET_KEY_TEST');

      for (const sponsorship of sponsorships) {
        try {
          results.sponsorshipsProcessed++;

          if (!sponsorship.stripe_subscription_id) {
            logs.push(logStep(`Skipping sponsorship ${sponsorship.id} - no subscription ID`));
            continue;
          }

          // Initialize correct Stripe client
          const stripeKey = sponsorship.stripe_mode === 'live' ? stripeKeyLive : stripeKeyTest;
          if (!stripeKey) {
            logs.push(logStep(`Skipping sponsorship ${sponsorship.id} - Stripe key not configured for ${sponsorship.stripe_mode} mode`));
            continue;
          }

          const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

          // Get all invoices for this subscription
          const invoices = await stripe.invoices.list({
            subscription: sponsorship.stripe_subscription_id,
            limit: 100,
          });

          logs.push(logStep(`Found ${invoices.data.length} invoices for subscription ${sponsorship.stripe_subscription_id}`));

          for (const invoice of invoices.data) {
            if (invoice.status !== 'paid') continue;

            // Check if receipt already exists
            const { data: existingReceipt } = await supabaseClient
              .from("sponsorship_receipts")
              .select("id")
              .eq("transaction_id", invoice.id)
              .single();

            if (existingReceipt) {
              continue; // Receipt already exists
            }

            // Get sponsor info
            let sponsorEmail = sponsorship.sponsor_email;
            let sponsorName = "Sponsor";

            if (sponsorship.sponsor_id) {
              const { data: profile } = await supabaseClient
                .from("profiles")
                .select("email, display_name")
                .eq("id", sponsorship.sponsor_id)
                .single();

              if (profile) {
                sponsorEmail = sponsorEmail || profile.email;
                sponsorName = profile.display_name || "Sponsor";
              }
            }

            if (!sponsorEmail) {
              logs.push(logStep(`Skipping invoice ${invoice.id} - no sponsor email`));
              continue;
            }

            const bestieName = (sponsorship.sponsor_besties as any)?.bestie_name || "Bestie";
            const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
            const taxYear = new Date(invoice.created * 1000).getFullYear();

            const { data: receipt, error: insertError } = await supabaseClient
              .from("sponsorship_receipts")
              .insert({
                sponsorship_id: sponsorship.id,
                sponsor_email: sponsorEmail,
                sponsor_name: sponsorName,
                user_id: sponsorship.sponsor_id,
                bestie_name: bestieName,
                amount: (invoice.amount_paid || 0) / 100,
                frequency: "monthly",
                transaction_id: invoice.id,
                transaction_date: new Date(invoice.created * 1000).toISOString(),
                stripe_mode: sponsorship.stripe_mode,
                organization_name: orgName,
                organization_ein: orgEin,
                receipt_number: receiptNumber,
                tax_year: taxYear,
              })
              .select()
              .single();

            if (insertError) {
              logs.push(logStep(`Failed to create receipt for invoice ${invoice.id}`, insertError));
              results.errors.push({ invoice_id: invoice.id, error: insertError.message });
              continue;
            }

            results.sponsorshipReceiptsCreated++;
            logs.push(logStep(`Created receipt for invoice ${invoice.id} → ${sponsorEmail}`));

            // Send email
            try {
              await supabaseClient.functions.invoke("send-sponsorship-receipt", {
                body: { receiptId: receipt.id },
              });
              logs.push(logStep(`Sent receipt email to ${sponsorEmail}`));
            } catch (emailError: any) {
              logs.push(logStep(`Failed to send email for ${invoice.id}`, emailError));
            }
          }
        } catch (error: any) {
          logs.push(logStep(`Error processing sponsorship ${sponsorship.id}`, error));
          results.errors.push({ sponsorship_id: sponsorship.id, error: error.message });
        }
      }
    }

    logs.push(logStep("=== RECOVERY COMPLETE ==="));

    return new Response(
      JSON.stringify({
        message: `Recovery complete: Fixed ${results.pendingDonationsFixed} pending donations, created ${results.donationReceiptsCreated} donation receipts + ${results.sponsorshipReceiptsCreated} sponsorship receipts`,
        ...results,
        logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in generate-missing-receipts:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
