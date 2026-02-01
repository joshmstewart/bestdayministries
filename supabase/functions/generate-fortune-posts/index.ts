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

    // Create a discussion post for comments using the system user
    // First, try to get the dedicated system user from app_settings
    const { data: systemUserSetting } = await adminClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "system_user_id")
      .maybeSingle();

    let authorId: string | null = systemUserSetting?.setting_value as string | null;

    // Fall back to first admin/owner if system user not configured
    if (!authorId) {
      const { data: adminUser } = await adminClient
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "owner"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      authorId = adminUser?.user_id || null;
    }

    if (authorId) {
      const sourceTypeLabel = selectedFortune.source_type === "bible_verse" 
        ? "Scripture" 
        : selectedFortune.source_type === "affirmation" 
          ? "Affirmation" 
          : "Quote";

      const { data: discussionPost } = await adminClient
        .from("discussion_posts")
        .insert({
          author_id: authorId,
          title: `✨ Daily Inspiration: ${sourceTypeLabel} of the Day`,
          content: `"${selectedFortune.content}"${selectedFortune.author ? `\n\n— ${selectedFortune.author}` : ""}${selectedFortune.reference ? ` (${selectedFortune.reference})` : ""}\n\nHow does this resonate with you today? Share your thoughts!`,
          is_moderated: true,
          approval_status: "approved",
        })
        .select()
        .single();

      if (discussionPost) {
        await adminClient
          .from("daily_fortune_posts")
          .update({ discussion_post_id: discussionPost.id })
          .eq("id", newPost.id);
      }
    }

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
