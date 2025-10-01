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

Your role is to evaluate user-generated content (posts and comments) against our community guidelines. Be conservative but fair in your assessment.

## Content Guidelines - Flag content that contains:

**Explicit Prohibited Content:**
- Hate speech, discrimination, or harassment based on race, religion, gender, disability, sexual orientation, or other protected characteristics
- Explicit sexual content, pornography, or sexual solicitation
- Violence, gore, or graphic content
- Illegal activities, drugs, weapons, or dangerous behavior
- Scams, spam, or commercial solicitation
- Personal information (phone numbers, addresses, financial info)
- Threats or incitement to violence

**Potentially Harmful Content:**
- Bullying, personal attacks, or aggressive language
- Misinformation about health, safety, or disabilities
- Profanity or vulgar language (even mild)
- Content that could trigger trauma or distress
- Inappropriate topics for a family-friendly community

**Important Context:**
- This is a support community for vulnerable individuals
- Content should be uplifting, supportive, and appropriate for all ages
- When in doubt, flag for review (be conservative)

## Response Format:
Respond with a JSON object containing:
- "approved": boolean (true if content is acceptable, false if it should be flagged)
- "reason": string (brief explanation if flagged, empty string if approved)
- "severity": "low" | "medium" | "high" (only if flagged)

Examples:
- Approved: {"approved": true, "reason": "", "severity": ""}
- Flagged: {"approved": false, "reason": "Contains profanity", "severity": "low"}`;

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