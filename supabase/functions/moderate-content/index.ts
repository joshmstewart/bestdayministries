import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, contentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Moderating ${contentType}:`, content);

    const systemPrompt = `You are a content moderation assistant for a supportive community platform called Joy House, which serves individuals with intellectual and developmental disabilities and their caregivers.

Your role is to evaluate user-generated content (posts and comments) against our community guidelines. Be VERY lenient - only flag content that is clearly and unambiguously harmful.

## Content Guidelines - ONLY FLAG content that contains:

**Explicit Prohibited Content (HIGH severity):**
- Hate speech, slurs, or discrimination targeting protected characteristics
- Explicit sexual content or pornography
- Graphic violence, gore, or threats of violence
- Illegal activities or dangerous behavior
- Scams or malicious links
- Sharing personal information (phone numbers, addresses, financial info)

**Severe Harmful Content (MEDIUM severity):**
- Direct personal attacks with hateful intent (e.g., "you're worthless and should die")
- Sustained harassment or bullying campaigns
- Severe profanity directed at specific individuals with intent to harm

## IMPORTANT - DO NOT FLAG:
- Test posts, greetings, friendly messages, or casual conversation
- Expressions of emotion or excitement (e.g., "OMG!", "I love this!", "this is awesome!")
- Constructive disagreement, debate, or expressing opinions
- Sharing personal stories, experiences, or asking for help
- Mild frustration or venting (without targeting individuals)
- Informal or casual language
- Questions, comments, or general discussion

**Key Principle: When in doubt, APPROVE. Only flag if you are absolutely certain the content violates the explicit prohibitions above.**

## Response Format:
Respond with a JSON object containing:
- "approved": boolean (true if content is acceptable, false if it should be flagged)
- "reason": string (brief explanation if flagged, empty string if approved)
- "severity": "low" | "medium" | "high" (only if flagged)

Examples:
- Approved: {"approved": true, "reason": "", "severity": ""}
- Flagged: {"approved": false, "reason": "Direct personal attack with hateful language", "severity": "medium"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Moderate this ${contentType}: "${content}"` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI moderation failed");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    console.log("Moderation result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in moderate-content:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        // Fail open - allow content if moderation fails
        approved: true,
        reason: "Moderation check failed",
        severity: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});