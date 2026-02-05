import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}`, details ? JSON.stringify(details, null, 2) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results = {
    recovered: [] as any[],
    failed: [] as any[],
    skipped: [] as any[],
  };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .single();
      
      if (!roleData || !["admin", "owner"].includes(roleData.role)) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find stuck placeholder receipts (sponsor_email = 'pending@processing.temp')
    const { data: stuckReceipts, error: queryError } = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("*")
      .eq("sponsor_email", "pending@processing.temp")
      .order("created_at", { ascending: false });

    if (queryError) {
      throw new Error(`Failed to query stuck receipts: ${queryError.message}`);
    }

    logStep("Found stuck receipts", { count: stuckReceipts?.length || 0 });

    if (!stuckReceipts || stuckReceipts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stuck receipts found", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Process each stuck receipt
    for (const receipt of stuckReceipts) {
      const sessionId = receipt.transaction_id;
      
      if (!sessionId || !sessionId.startsWith("cs_")) {
        results.skipped.push({ id: receipt.id, reason: "Invalid session ID format" });
        continue;
      }

      try {
        // Determine Stripe mode from session ID
        const isTestSession = sessionId.startsWith("cs_test_");
        const mode = isTestSession ? "test" : "live";
        
        const stripeKey = mode === "live"
          ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
          : Deno.env.get("STRIPE_SECRET_KEY_TEST");
        
        if (!stripeKey) {
          results.failed.push({ id: receipt.id, sessionId, error: `Stripe ${mode} key not configured` });
          continue;
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // Retrieve the Stripe session
        let session;
        try {
          session = await stripe.checkout.sessions.retrieve(sessionId);
        } catch (stripeError: any) {
          // Session may have expired (older than 30 days)
          results.failed.push({ 
            id: receipt.id, 
            sessionId, 
            error: `Stripe session not found: ${stripeError.message}` 
          });
          continue;
        }

        logStep("Retrieved Stripe session", { sessionId, status: session.payment_status });

        if (session.payment_status !== "paid") {
          // Payment was never completed - delete the orphaned placeholder
          await supabaseAdmin.from("sponsorship_receipts").delete().eq("id", receipt.id);
          results.skipped.push({ id: receipt.id, sessionId, reason: "Payment not completed, placeholder deleted" });
          continue;
        }

        // Get customer email
        const customerEmail = session.customer_details?.email || session.customer_email;
        if (!customerEmail) {
          results.failed.push({ id: receipt.id, sessionId, error: "No customer email in session" });
          continue;
        }

        // Find user by email
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const user = usersData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
        const userId = user?.id || null;

        // Get bestie info
        const bestieId = session.metadata?.bestie_id;
        if (!bestieId) {
          results.failed.push({ id: receipt.id, sessionId, error: "No bestie_id in session metadata" });
          continue;
        }

        const { data: bestieData } = await supabaseAdmin
          .from("sponsor_besties")
          .select("bestie_name, bestie_id")
          .eq("id", bestieId)
          .single();

        if (!bestieData) {
          results.failed.push({ id: receipt.id, sessionId, error: "Bestie not found" });
          continue;
        }

        // Get amount from metadata
        const fullAmount = parseFloat(session.metadata?.amount || "0");
        const frequency = session.metadata?.frequency || "monthly";

        // Check if sponsorship already exists
        let sponsorshipId = null;
        const stripeReferenceId = session.subscription || session.payment_intent;

        if (stripeReferenceId) {
          const { data: existingSponsorship } = await supabaseAdmin
            .from("sponsorships")
            .select("id")
            .eq("stripe_subscription_id", stripeReferenceId)
            .maybeSingle();
          
          sponsorshipId = existingSponsorship?.id;
        }

        // Create sponsorship if it doesn't exist
        if (!sponsorshipId) {
          const startedAt = new Date(session.created * 1000);
          const endedAt = frequency === "one-time"
            ? new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;

          const { data: newSponsorship, error: sponsorshipError } = await supabaseAdmin
            .from("sponsorships")
            .insert({
              sponsor_id: userId,
              sponsor_email: userId ? null : customerEmail,
              sponsor_bestie_id: bestieId,
              bestie_id: bestieData.bestie_id,
              amount: fullAmount,
              frequency,
              status: "active",
              started_at: startedAt.toISOString(),
              ended_at: endedAt?.toISOString() || null,
              stripe_subscription_id: stripeReferenceId as string || null,
              stripe_customer_id: session.customer as string,
              stripe_mode: mode,
            })
            .select("id")
            .single();

          if (sponsorshipError) {
            // May be duplicate - try to find existing
            if (sponsorshipError.code === "23505") {
              const { data: existing } = await supabaseAdmin
                .from("sponsorships")
                .select("id")
                .or(`stripe_subscription_id.eq.${stripeReferenceId},stripe_checkout_session_id.eq.${sessionId}`)
                .maybeSingle();
              sponsorshipId = existing?.id;
            } else {
              results.failed.push({ id: receipt.id, sessionId, error: `Sponsorship creation failed: ${sponsorshipError.message}` });
              continue;
            }
          } else {
            sponsorshipId = newSponsorship?.id;
          }
        }

        // Update the placeholder receipt with real data
        const { error: updateError } = await supabaseAdmin
          .from("sponsorship_receipts")
          .update({
            sponsorship_id: sponsorshipId,
            sponsor_email: customerEmail,
            sponsor_name: customerEmail.split("@")[0],
            bestie_name: bestieData.bestie_name,
            amount: fullAmount,
            frequency,
            transaction_date: new Date(session.created * 1000).toISOString(),
            receipt_number: `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            user_id: userId,
          })
          .eq("id", receipt.id);

        if (updateError) {
          results.failed.push({ id: receipt.id, sessionId, error: `Receipt update failed: ${updateError.message}` });
          continue;
        }

        // Send receipt email
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              sponsorEmail: customerEmail,
              bestieName: bestieData.bestie_name,
              amount: fullAmount,
              frequency,
              transactionId: sessionId,
              transactionDate: new Date(session.created * 1000).toISOString(),
              stripeMode: mode,
            }),
          });
          logStep("Receipt email sent", { sessionId, email: customerEmail });
        } catch (emailError) {
          logStep("Email sending failed (non-fatal)", { sessionId, error: String(emailError) });
        }

        results.recovered.push({
          id: receipt.id,
          sessionId,
          sponsorshipId,
          email: customerEmail,
          bestieName: bestieData.bestie_name,
          amount: fullAmount,
          frequency,
        });

        logStep("Successfully recovered", { sessionId, email: customerEmail });

      } catch (error) {
        results.failed.push({ 
          id: receipt.id, 
          sessionId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Recovered ${results.recovered.length} sponsorships, ${results.failed.length} failed, ${results.skipped.length} skipped`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : "Unknown error" });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
