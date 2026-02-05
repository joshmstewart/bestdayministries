import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Get user ID from request body (for testing)
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");
    
    // Get user data using service role
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError) throw userError;
    if (!userData.user?.email) throw new Error("User email not found");

    console.log(`Generating missing receipts for user: ${userData.user.email}`);

    // Get user's sponsorships that don't have receipts yet
    const { data: sponsorships, error: sponsorshipsError } = await supabaseClient
      .from("sponsorships")
      .select(`
        id,
        amount,
        frequency,
        started_at,
        stripe_subscription_id,
        stripe_mode,
        sponsor_bestie_id,
        sponsor_besties(bestie_name)
      `)
      .eq("sponsor_id", userData.user.id)
      .eq("status", "active");

    if (sponsorshipsError) {
      console.error("Error fetching sponsorships:", sponsorshipsError);
      throw sponsorshipsError;
    }

    if (!sponsorships || sponsorships.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active sponsorships found", receiptsGenerated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${sponsorships.length} active sponsorships`);

    // Check which sponsorships already have receipts
    const { data: existingReceipts, error: receiptsError } = await supabaseClient
      .from("sponsorship_receipts")
      .select("sponsorship_id")
      .eq("sponsor_email", userData.user.email);

    if (receiptsError) {
      console.error("Error checking existing receipts:", receiptsError);
      throw receiptsError;
    }

    const existingReceiptIds = new Set(
      existingReceipts?.map(r => r.sponsorship_id) || []
    );

    // Filter to only sponsorships without receipts
    const sponsorshipsNeedingReceipts = sponsorships.filter(
      s => !existingReceiptIds.has(s.id)
    );

    console.log(`${sponsorshipsNeedingReceipts.length} sponsorships need receipts`);

    if (sponsorshipsNeedingReceipts.length === 0) {
      return new Response(
        JSON.stringify({ message: "All sponsorships already have receipts", receiptsGenerated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name")
      .eq("id", userData.user.id)
      .single();

    const sponsorName = profile?.display_name || "Sponsor";

    // Generate receipts for each sponsorship
    const receiptsToCreate = sponsorshipsNeedingReceipts.map((sponsorship: any) => {
      const transactionDate = new Date(sponsorship.started_at);
      const taxYear = transactionDate.getFullYear();
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      const bestieName = sponsorship.sponsor_besties?.bestie_name || "Bestie";
      
      return {
        sponsorship_id: sponsorship.id,
        user_id: userData.user.id,
        sponsor_email: userData.user.email,
        sponsor_name: sponsorName,
        bestie_name: bestieName,
        amount: sponsorship.amount,
        frequency: sponsorship.frequency,
        transaction_date: sponsorship.started_at,
        transaction_id: sponsorship.stripe_subscription_id || sponsorship.id,
        receipt_number: receiptNumber,
        tax_year: taxYear,
        stripe_mode: sponsorship.stripe_mode || 'test', // Default to test if not set
      };
    });

    console.log(`Creating ${receiptsToCreate.length} receipt records...`);

    // Insert all receipts
    const { data: createdReceipts, error: insertError } = await supabaseClient
      .from("sponsorship_receipts")
      .insert(receiptsToCreate)
      .select();

    if (insertError) {
      console.error("Error creating receipts:", insertError);
      throw insertError;
    }

    console.log(`Successfully created ${createdReceipts?.length || 0} receipts`);

    return new Response(
      JSON.stringify({
        message: `Successfully generated ${createdReceipts?.length || 0} receipt(s)`,
        receiptsGenerated: createdReceipts?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in generate-missing-receipts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
