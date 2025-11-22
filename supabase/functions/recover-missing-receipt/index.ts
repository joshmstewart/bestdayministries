import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("paymentIntentId is required");
    }

    console.log(`Recovering receipt for payment intent: ${paymentIntentId}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if receipt already exists
    const { data: existingReceipt } = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("id")
      .eq("transaction_id", paymentIntentId)
      .maybeSingle();

    if (existingReceipt) {
      return new Response(
        JSON.stringify({ 
          message: "Receipt already exists", 
          receipt_id: existingReceipt.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get payment intent details from Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_LIVE not configured");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Fetching payment intent from Stripe...");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent.invoice) {
      throw new Error("Payment intent has no associated invoice");
    }

    console.log("Fetching invoice from Stripe...");
    const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
    
    if (!invoice.subscription) {
      throw new Error("Invoice has no associated subscription");
    }

    const subscriptionId = invoice.subscription as string;
    const customerEmail = invoice.customer_email;

    if (!customerEmail) {
      throw new Error("No customer email found on invoice");
    }

    console.log(`Found subscription: ${subscriptionId}, email: ${customerEmail}`);

    // Find the sponsorship
    const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
      .from("sponsorships")
      .select("id, bestie_id, amount, stripe_mode")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("stripe_mode", "live")
      .maybeSingle();

    if (sponsorshipError || !sponsorship) {
      throw new Error(`Sponsorship not found for subscription ${subscriptionId}`);
    }

    console.log(`Found sponsorship: ${sponsorship.id}`);

    // Get bestie name
    const { data: sponsorBestieData } = await supabaseAdmin
      .from("sponsor_besties")
      .select("bestie_name")
      .eq("bestie_id", sponsorship.bestie_id)
      .maybeSingle();

    const bestieName = sponsorBestieData?.bestie_name || "Bestie";

    // Get organization info for receipt
    const { data: receiptSettings } = await supabaseAdmin
      .from("receipt_settings")
      .select("organization_name, organization_ein")
      .limit(1)
      .maybeSingle();

    const orgName = receiptSettings?.organization_name || "Best Day Ministries";
    const orgEin = receiptSettings?.organization_ein || "00-0000000";

    // Get user info
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData.users.find(
      (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : sponsorship.amount;
    const transactionDate = new Date(paymentIntent.created * 1000).toISOString();
    const taxYear = new Date(paymentIntent.created * 1000).getFullYear();
    const receiptNumber = `RCP-RECOVERY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    console.log("Creating receipt record...");

    // Create the receipt
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("sponsorship_receipts")
      .insert({
        sponsorship_id: sponsorship.id,
        user_id: user?.id || null,
        sponsor_email: customerEmail,
        sponsor_name: user?.user_metadata?.display_name || customerEmail.split('@')[0],
        bestie_name: bestieName,
        amount: amountPaid,
        frequency: "monthly",
        transaction_id: paymentIntentId,
        transaction_date: transactionDate,
        receipt_number: receiptNumber,
        tax_year: taxYear,
        organization_name: orgName,
        organization_ein: orgEin,
        stripe_mode: "live",
        status: "generated"
      })
      .select()
      .single();

    if (receiptError) {
      console.error("Receipt creation error:", receiptError);
      throw receiptError;
    }

    console.log(`Receipt created successfully: ${receipt.id}`);

    return new Response(
      JSON.stringify({
        message: "Receipt recovered successfully",
        receipt_id: receipt.id,
        sponsorship_id: sponsorship.id,
        amount: amountPaid,
        customer_email: customerEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error recovering receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
