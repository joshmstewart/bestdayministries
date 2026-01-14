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
    const { question, answer } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a joke quality reviewer. Analyze if a Q&A joke actually makes sense as a joke/pun.

A GOOD joke has:
- A punchline that is a real pun, wordplay, or logical twist related to the question
- The answer connects meaningfully to the question's setup

A BAD joke has:
- A punchline that doesn't connect to the question
- Made-up words or nonsensical wordplay (e.g., "loan of bread" instead of "loaf of bread")
- No actual pun or humor logic

Respond ONLY with valid JSON:
{"quality": "good" | "bad", "reason": "Brief explanation of why"}

Be strict - if the pun doesn't work, mark it bad.`
          },
          {
            role: 'user',
            content: `Question: ${question}\nAnswer: ${answer}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // Parse the JSON from the response - strip markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const review = JSON.parse(jsonContent.trim());

    return new Response(JSON.stringify(review), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reviewing joke:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to review joke' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
