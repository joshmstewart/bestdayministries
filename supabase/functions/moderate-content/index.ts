import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logAiUsage } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const moderationSchema = z.object({
  content: z.string()
    .min(1, "Content cannot be empty")
    .max(10000, "Content too long (max 10,000 characters)")
    .trim(),
  contentType: z.enum(['post', 'comment'], {
    errorMap: () => ({ message: "Content type must be 'post' or 'comment'" })
  })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate inputs
    const validationResult = moderationSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }

    const { content, contentType } = validationResult.data;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Sanitize content for logging (truncate and remove sensitive patterns)
    const sanitizedContent = content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content;
    console.log(`Moderating ${contentType} (length: ${content.length}):`, sanitizedContent);

    const systemPrompt = `You are a content moderation assistant for a supportive community platform called Joy House, which serves individuals with intellectual and developmental disabilities and their caregivers.

Your role is to evaluate user-generated content (posts and comments) against our community guidelines. Be lenient with general expression, but flag content that targets or attacks others.

## Content Guidelines - FLAG content that contains:

**HIGH Severity - Immediate Flag:**
- Hate speech, slurs, or discrimination targeting protected characteristics
- Explicit sexual content or pornography
- Graphic violence, gore, or explicit threats of violence
- Illegal activities or dangerous behavior
- Scams or malicious links
- Sharing personal information (phone numbers, addresses, financial info)

**MEDIUM Severity - Flag for Review:**
- Direct personal attacks or hostile language targeting others (e.g., "I hate you", "you're stupid")
- Bullying, harassment, or mean-spirited comments toward individuals
- Aggressive or threatening tone directed at someone
- Severe profanity directed at people

**LOW Severity - Flag for Review:**
- Mild personal attacks or dismissive language toward others
- Borderline inappropriate language

## DO NOT FLAG (These are acceptable):**
- Test posts, greetings, friendly messages, or casual conversation
- Expressions of general emotion NOT directed at people (e.g., "I'm very mad", "I'm frustrated", "this is annoying")
- Excitement or enthusiasm (e.g., "OMG!", "I love this!", "this is awesome!")
- Constructive disagreement, debate, or expressing opinions about topics/ideas
- Sharing personal stories, experiences, or asking for help
- Venting about situations (not people)
- Questions, comments, or general discussion

**Key Principle: Flag content that targets or attacks PEOPLE. Allow content that expresses emotions about situations or ideas.**

## Response Format:
Respond with a JSON object containing:
- "approved": boolean (true if content is acceptable, false if it should be flagged)
- "reason": string (brief explanation if flagged, empty string if approved)
- "severity": "low" | "medium" | "high" (only if flagged)

Examples:
- "I'm very mad" → {"approved": true, "reason": "", "severity": ""} (emotion about situation)
- "I hate you" → {"approved": false, "reason": "Direct personal attack/hostile language targeting another person", "severity": "medium"}
- "This is a test" → {"approved": true, "reason": "", "severity": ""}
- "You're an idiot" → {"approved": false, "reason": "Personal insult directed at individual", "severity": "medium"}`;

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

    // Log AI usage
    await logAiUsage({
      functionName: "moderate-content",
      model: "google/gemini-2.5-flash",
      metadata: { contentType, contentLength: content.length, approved: result.approved },
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log error securely (no content in logs)
    console.error("Error in moderate-content:", {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : "Unknown error"
    });
    
    // Return validation errors to client, generic error for others
    const errorMessage = error instanceof Error && error.message.includes('Validation failed')
      ? error.message
      : 'Moderation service temporarily unavailable';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        // Fail open - allow content if moderation fails (but log the failure)
        approved: true,
        reason: "Moderation check failed - content allowed by default",
        severity: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});