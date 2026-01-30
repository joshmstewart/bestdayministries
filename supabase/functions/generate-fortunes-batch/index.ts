import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { source_type = "affirmation", count = 20 } = body;

    // Generate fortunes using AI
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.lovable.dev";
    
    let prompt = "";
    if (source_type === "bible_verse") {
      prompt = `Generate ${count} REAL, ACTUAL Bible verses from the NIV or KJV translation. These must be genuine scripture that can be verified.

For each verse, provide:
1. The EXACT verse text as it appears in the Bible (NIV or KJV)
2. The precise Bible reference (Book Chapter:Verse format)

EXAMPLES of valid verses:
- "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." - John 3:16
- "I can do all things through Christ who strengthens me." - Philippians 4:13
- "The Lord is my shepherd; I shall not want." - Psalm 23:1
- "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." - Joshua 1:9

Focus on verses about: love, hope, joy, being valued, God's care, encouragement, strength, peace, and friendship.

CRITICAL REQUIREMENTS:
- These must be REAL Bible verses, not made-up spiritual sayings
- Include the EXACT reference (e.g., "John 3:16", "Psalm 23:1-2", "Romans 8:28")
- Use common, encouraging passages that are accessible to all readers

Format as JSON array:
[{"content": "exact verse text", "reference": "Book Chapter:Verse"}]`;
    } else if (source_type === "affirmation") {
      prompt = `Generate ${count} unique, positive affirmations for adults with intellectual and developmental disabilities.

Make them:
- Simple sentences (8-15 words max)
- First-person statements ("I am...", "I can...", "I have...")
- Focused on self-worth, abilities, belonging, and positive qualities
- Easy to remember and repeat daily

EXAMPLES:
- "I am loved and valued exactly as I am."
- "I can do hard things with help from my friends."
- "My feelings matter and it's okay to express them."
- "I am getting better every day."
- "I belong here and I am important."

Format as JSON array:
[{"content": "the affirmation text"}]`;
    } else if (source_type === "life_lesson") {
      prompt = `Generate ${count} simple life lessons and wisdom for adults with intellectual and developmental disabilities.

Focus on practical wisdom about:
- Friendship and relationships
- Handling emotions
- Being kind to yourself
- Trying new things
- Dealing with disappointment
- Celebrating small wins

Make them conversational and relatable, like advice from a caring friend.

EXAMPLES:
- "It's okay to ask for help. That's what friends are for."
- "Making mistakes means you're trying something new. That's brave!"
- "A bad day doesn't mean a bad life. Tomorrow is a fresh start."

Format as JSON array:
[{"content": "the life lesson text"}]`;
    } else if (source_type === "gratitude_prompt") {
      prompt = `Generate ${count} gratitude prompts to help adults with intellectual and developmental disabilities reflect on the good things in life.

Make them:
- Simple questions or statements that prompt reflection
- Related to everyday experiences (friends, activities, small pleasures)
- Easy to connect to their daily life

EXAMPLES:
- "What made you smile today?"
- "Think of someone who helps you. What do you appreciate about them?"
- "What's your favorite thing about where you live?"
- "What food are you grateful for?"

Format as JSON array:
[{"content": "the gratitude prompt text"}]`;
    } else if (source_type === "discussion_starter") {
      prompt = `Generate ${count} thought-provoking discussion questions for adults with intellectual and developmental disabilities.

Topics should encourage sharing experiences and opinions about:
- Favorite things (food, activities, places)
- Dreams and goals
- Friendship and helping others
- Handling challenges
- What makes them happy

EXAMPLES:
- "If you could have any superpower, what would it be and why?"
- "What's the nicest thing someone did for you recently?"
- "If you could learn to do anything, what would you choose?"
- "What does being a good friend mean to you?"

Format as JSON array:
[{"content": "the discussion question text"}]`;
    } else {
      // Default: inspirational_quote
      prompt = `Generate ${count} REAL, VERIFIED inspirational quotes from famous people. These must be actual quotes that can be attributed to real historical or contemporary figures.

CRITICAL: Only use quotes that are genuinely from these people, not misattributed or made-up quotes.

Include quotes from well-known figures like:
- Helen Keller, Walt Disney, Mr. Rogers, Dr. Seuss
- Maya Angelou, Nelson Mandela, Winston Churchill
- Oprah Winfrey, Michael Jordan, Albert Einstein
- Martin Luther King Jr., Mahatma Gandhi

EXAMPLES of valid quotes:
- "The only thing we have to fear is fear itself." - Franklin D. Roosevelt
- "Be the change you wish to see in the world." - Mahatma Gandhi
- "You're braver than you believe, stronger than you seem, and smarter than you think." - A.A. Milne
- "No one can make you feel inferior without your consent." - Eleanor Roosevelt

REQUIREMENTS:
- Every quote MUST include the author
- Only use quotes you are confident are accurately attributed
- Choose encouraging, uplifting quotes about courage, kindness, perseverance, and self-worth
- Avoid complex or abstract quotes - keep them accessible

Format as JSON array:
[{"content": "quote text", "author": "Person Name"}]`;
    }

    const aiResponse = await fetch(`${aiGatewayUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates uplifting content. Always respond with valid JSON arrays only, no markdown."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let fortunes: any[] = [];
    try {
      // Remove potential markdown code blocks
      const cleanContent = rawContent.replace(/```json\n?|\n?```/g, "").trim();
      fortunes = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", rawContent);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Insert fortunes into database
    const fortunesToInsert = fortunes.map((f: any) => ({
      content: f.content,
      source_type,
      author: f.author || null,
      reference: f.reference || null,
      is_approved: false,
      is_used: false,
      created_by: user.id,
    }));

    const { data: insertedData, error: insertError } = await adminClient
      .from("daily_fortunes")
      .insert(fortunesToInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      count: insertedData?.length || 0,
      fortunes: insertedData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-fortunes-batch:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
