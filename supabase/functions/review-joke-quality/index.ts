import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Support both single joke and bulk jokes
    const jokes = body.jokes || [{ id: body.id, question: body.question, answer: body.answer }];
    
    // Format jokes for review
    const jokesText = jokes.map((j: any, i: number) => 
      `${i + 1}. Q: ${j.question}\n   A: ${j.answer}`
    ).join('\n\n');

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
            content: `You are a joke quality reviewer for jokes intended for adults with intellectual disabilities. 

Analyze each joke and determine if it's GOOD or BAD.

A GOOD joke has:
- Simple, everyday words that are easy to understand
- A punchline that is a real pun, wordplay, or logical twist
- The answer connects meaningfully to the question's setup
- Concrete, visual concepts (animals, food, everyday objects)

A BAD joke has:
- A punchline that doesn't connect to the question
- Made-up words or nonsensical wordplay (e.g., "loan of bread" instead of "loaf of bread")
- Complex wordplay requiring spelling knowledge
- Abstract concepts or technical terms
- No actual pun or humor logic
- Too similar to common/overused jokes

You will receive numbered jokes. Respond ONLY with a valid JSON array in this exact format:
[
  {"index": 1, "quality": "good", "reason": "Brief explanation"},
  {"index": 2, "quality": "bad", "reason": "Brief explanation"}
]

Be strict - if the pun doesn't work or is too complex, mark it bad.`
          },
          {
            role: 'user',
            content: `Review these ${jokes.length} jokes:\n\n${jokesText}`
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
    const reviews = JSON.parse(jsonContent.trim());

    // Map reviews back to joke IDs
    const results = reviews.map((review: any) => ({
      id: jokes[review.index - 1]?.id,
      quality: review.quality,
      reason: review.reason
    }));

    return new Response(JSON.stringify({ reviews: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reviewing jokes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to review jokes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
