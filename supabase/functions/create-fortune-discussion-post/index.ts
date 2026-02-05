import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fortunePostId } = await req.json();

    if (!fortunePostId) {
      return new Response(
        JSON.stringify({ error: "fortunePostId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a discussion post already exists for this fortune
    const { data: existingFortune, error: fortuneError } = await adminClient
      .from("daily_fortune_posts")
      .select("id, discussion_post_id, fortune_id")
      .eq("id", fortunePostId)
      .single();

    if (fortuneError || !existingFortune) {
      return new Response(
        JSON.stringify({ error: "Fortune post not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If discussion post already exists, return it
    if (existingFortune.discussion_post_id) {
      return new Response(
        JSON.stringify({ 
          discussionPostId: existingFortune.discussion_post_id,
          message: "Discussion post already exists"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the fortune content for the discussion post title
    const { data: fortune, error: fortuneDataError } = await adminClient
      .from("daily_fortunes")
      .select("content, source_type, author, reference")
      .eq("id", existingFortune.fortune_id)
      .single();

    if (fortuneDataError || !fortune) {
      return new Response(
        JSON.stringify({ error: "Fortune content not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the system user ID from app_settings
    const { data: systemUserSetting } = await adminClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "system_user_id")
      .maybeSingle();

    let systemUserId: string | null = null;

    if (systemUserSetting?.setting_value) {
      const settingValue = systemUserSetting.setting_value;
      systemUserId = typeof settingValue === 'string' ? settingValue : (settingValue as any).id || null;
    }

    // If no system user configured, try to find one by email
    if (!systemUserId) {
      const { data: systemUser } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", "system@bestdayministries.app")
        .maybeSingle();
      
      systemUserId = systemUser?.id || null;
    }

    // If still no system user, get the first owner/admin as fallback
    if (!systemUserId) {
      const { data: adminUsers } = await adminClient
        .from("user_roles")
        .select("user_id")
        .in("role", ["owner", "admin"])
        .limit(1);
      
      systemUserId = adminUsers?.[0]?.user_id || null;
    }

    if (!systemUserId) {
      return new Response(
        JSON.stringify({ error: "No system user found to author the discussion post" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a title based on the source type
    const getSourceLabel = (type: string) => {
      switch (type) {
        case "bible_verse": return "Scripture";
        case "affirmation": return "Affirmation";
        case "life_lesson": return "Life Lesson";
        case "gratitude_prompt": return "Gratitude Prompt";
        case "discussion_starter": return "Discussion Starter";
        case "proverbs": return "Biblical Wisdom";
        default: return "Quote";
      }
    };

    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Denver'
    });

    const title = `Daily Inspiration - ${today}`;
    const sourceLabel = getSourceLabel(fortune.source_type);
    
    let content = `**Today's ${sourceLabel}:**\n\n"${fortune.content}"`;
    if (fortune.author || fortune.reference) {
      content += `\n\n— ${fortune.author || ''}${fortune.reference ? ` (${fortune.reference})` : ''}`;
    }
    content += `\n\n💬 Share your thoughts on today's inspiration!`;

    // Create the discussion post
    const { data: discussionPost, error: discussionError } = await adminClient
      .from("discussion_posts")
      .insert({
        author_id: systemUserId,
        title,
        content,
        is_moderated: true,
        approval_status: 'approved',
        is_fortune_post: true,
        share_to_feed: true,
        visible_to_roles: ['supporter', 'bestie', 'caregiver', 'admin', 'owner'],
      })
      .select("id")
      .single();

    if (discussionError || !discussionPost) {
      console.error("Error creating discussion post:", discussionError);
      return new Response(
        JSON.stringify({ error: "Failed to create discussion post" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link the discussion post to the fortune post
    await adminClient
      .from("daily_fortune_posts")
      .update({ discussion_post_id: discussionPost.id })
      .eq("id", fortunePostId);

    console.log(`Created discussion post ${discussionPost.id} for fortune ${fortunePostId}`);

    return new Response(
      JSON.stringify({ 
        discussionPostId: discussionPost.id,
        message: "Discussion post created successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-fortune-discussion-post:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
