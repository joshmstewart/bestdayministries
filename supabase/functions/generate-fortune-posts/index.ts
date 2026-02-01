import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Get today's date in MST (America/Denver) timezone.
 */
function getMSTDate(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const todayMST = getMSTDate();

    // Check if today's fortune already exists
    const { data: existingPost } = await adminClient
      .from("daily_fortune_posts")
      .select("id")
      .eq("post_date", todayMST)
      .maybeSingle();

    if (existingPost) {
      return new Response(JSON.stringify({
        success: false,
        reason: "already_exists",
        post_id: existingPost.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get a random approved, unused fortune
    let { data: fortune, error: fortuneError } = await adminClient
      .from("daily_fortunes")
      .select("*")
      .eq("is_approved", true)
      .eq("is_used", false);

    if (fortuneError) throw fortuneError;

    // If no unused fortunes, reset all approved fortunes
    if (!fortune || fortune.length === 0) {
      console.log("No unused fortunes available, resetting all approved fortunes...");
      
      const { error: resetError } = await adminClient
        .from("daily_fortunes")
        .update({ is_used: false, used_date: null })
        .eq("is_approved", true);

      if (resetError) throw resetError;

      // Fetch again after reset
      const { data: resetFortunes, error: refetchError } = await adminClient
        .from("daily_fortunes")
        .select("*")
        .eq("is_approved", true)
        .eq("is_used", false);

      if (refetchError) throw refetchError;
      fortune = resetFortunes;
    }

    if (!fortune || fortune.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_approved_fortunes",
        message: "No approved fortunes available. Please add more in the admin panel.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a random fortune from the available ones
    const randomIndex = Math.floor(Math.random() * fortune.length);
    const selectedFortune = fortune[randomIndex];

    // Mark fortune as used
    await adminClient
      .from("daily_fortunes")
      .update({
        is_used: true,
        used_date: todayMST,
      })
      .eq("id", selectedFortune.id);

    // Create the daily fortune post
    const { data: newPost, error: postError } = await adminClient
      .from("daily_fortune_posts")
      .insert({
        fortune_id: selectedFortune.id,
        post_date: todayMST,
      })
      .select()
      .single();

    if (postError) throw postError;

    // NOTE: Discussion posts are NOT created here anymore.
    // They are created on-demand when someone comments on the fortune (see FortuneComments.tsx).
    // This prevents the feed from being cluttered with fortune posts that have no engagement.

    return new Response(JSON.stringify({
      success: true,
      post_id: newPost.id,
      fortune: {
        content: selectedFortune.content,
        source_type: selectedFortune.source_type,
        author: selectedFortune.author,
        reference: selectedFortune.reference,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-fortune-posts:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
