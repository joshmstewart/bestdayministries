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
      prompt = `Generate ${count} unique, uplifting Bible verses that would encourage adults with intellectual and developmental disabilities. For each verse, provide:
1. The verse text (KJV or NIV preferred)
2. The reference (e.g., "John 3:16")

Format as JSON array with objects containing: content, reference
Focus on verses about love, hope, joy, being valued, God's care, and encouragement.`;
    } else if (source_type === "affirmation") {
      prompt = `Generate ${count} unique, positive affirmations suitable for adults with intellectual and developmental disabilities. Make them:
- Simple and easy to understand
- Empowering and encouraging
- First-person statements starting with "I am" or "I can"
- Focused on self-worth, abilities, and positive qualities

Format as JSON array with objects containing: content (the affirmation text)`;
    } else {
      prompt = `Generate ${count} unique, inspirational quotes suitable for adults with intellectual and developmental disabilities. Include:
- Famous inspirational quotes
- Simple wisdom quotes
- Motivational sayings

For each quote, provide the author if known.
Format as JSON array with objects containing: content, author (or null if unknown)
Make them encouraging, easy to understand, and uplifting.`;
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
