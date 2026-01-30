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

    // Get an approved, unused fortune
    const { data: fortune, error: fortuneError } = await adminClient
      .from("daily_fortunes")
      .select("*")
      .eq("is_approved", true)
      .eq("is_used", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fortuneError) throw fortuneError;

    if (!fortune) {
      return new Response(JSON.stringify({
        success: false,
        reason: "no_approved_fortunes",
        message: "No approved fortunes available. Please add more in the admin panel.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark fortune as used
    await adminClient
      .from("daily_fortunes")
      .update({
        is_used: true,
        used_date: todayMST,
      })
      .eq("id", fortune.id);

    // Create the daily fortune post
    const { data: newPost, error: postError } = await adminClient
      .from("daily_fortune_posts")
      .insert({
        fortune_id: fortune.id,
        post_date: todayMST,
      })
      .select()
      .single();

    if (postError) throw postError;

    // Optionally create a discussion post for comments
    // Get an admin user to be the author
    const { data: adminUser } = await adminClient
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"])
      .limit(1)
      .maybeSingle();

    if (adminUser) {
      const sourceTypeLabel = fortune.source_type === "bible_verse" 
        ? "Scripture" 
        : fortune.source_type === "affirmation" 
          ? "Affirmation" 
          : "Quote";

      const { data: discussionPost } = await adminClient
        .from("discussion_posts")
        .insert({
          author_id: adminUser.user_id,
          title: `✨ Daily Inspiration: ${sourceTypeLabel} of the Day`,
          content: `"${fortune.content}"${fortune.author ? `\n\n— ${fortune.author}` : ""}${fortune.reference ? ` (${fortune.reference})` : ""}\n\nHow does this resonate with you today? Share your thoughts!`,
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
        content: fortune.content,
        source_type: fortune.source_type,
        author: fortune.author,
        reference: fortune.reference,
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
