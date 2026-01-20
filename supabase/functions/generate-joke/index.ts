import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;

async function generateJoke(apiKey: string, categoryPrompt: string): Promise<{ question: string; answer: string }> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a joke generator that creates family-friendly, corny jokes like those found on Laffy Taffy wrappers, bubble gum wrappers, or popsicle sticks. 
          
These are simple Q&A format jokes with a question and a punny answer. Keep them SHORT and SILLY.

${categoryPrompt}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"question": "Why did the cookie go to the doctor?", "answer": "Because it was feeling crummy!"}

No other text, just the JSON object.`
        },
        {
          role: 'user',
          content: 'Generate a funny joke!'
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
  return JSON.parse(jsonContent.trim());
}

async function reviewJokeQuality(apiKey: string, joke: { question: string; answer: string }): Promise<boolean> {
  const jokeText = `Q: ${joke.question}\nA: ${joke.answer}`;
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a joke quality reviewer for an app used by adults with intellectual and developmental disabilities (IDD).

Your job is to determine if a joke "makes sense" as a pun or joke. The jokes should be:
1. Simple Q&A format puns (like Laffy Taffy wrapper jokes)
2. The punchline should have a clear wordplay or pun connection to the question
3. Easy to understand - not too complex or abstract
4. Family-friendly and appropriate

Review this joke and respond with ONLY valid JSON:
{"quality": "good", "reason": "brief reason"} or {"quality": "bad", "reason": "brief reason"}

A joke is "bad" if:
- The punchline doesn't make sense as a pun
- The wordplay is too obscure or doesn't work
- It's confusing or the connection is unclear
- It's not appropriate for the audience`
        },
        {
          role: 'user',
          content: jokeText
        }
      ],
    }),
  });

  if (!response.ok) {
    console.error('Review API error:', response.status);
    // If review fails, let the joke through rather than blocking
    return true;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    return true; // Let it through if we can't parse
  }

  try {
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const review = JSON.parse(jsonContent.trim());
    console.log(`Joke review: ${review.quality} - ${review.reason}`);
    return review.quality === 'good';
  } catch {
    return true; // Let it through if we can't parse
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const categoryPrompt = category && category !== 'random' 
      ? `The joke should be about: ${category}.` 
      : '';

    // Try to generate a good joke, with retries if quality check fails
    let joke: { question: string; answer: string } | null = null;
    let attempts = 0;

    while (!joke && attempts < MAX_RETRIES) {
      attempts++;
      console.log(`Generating joke, attempt ${attempts}/${MAX_RETRIES}`);
      
      const candidateJoke = await generateJoke(LOVABLE_API_KEY, categoryPrompt);
      const isGood = await reviewJokeQuality(LOVABLE_API_KEY, candidateJoke);
      
      if (isGood) {
        joke = candidateJoke;
        console.log(`Joke passed quality check on attempt ${attempts}`);
      } else {
        console.log(`Joke failed quality check, retrying...`);
      }
    }

    // If all retries failed, return the last generated joke anyway
    if (!joke) {
      console.log('All retries exhausted, generating final joke without review');
      joke = await generateJoke(LOVABLE_API_KEY, categoryPrompt);
    }

    // Log AI usage (2 calls per attempt: generate + review)
    await logAiUsage({
      functionName: "generate-joke",
      model: "google/gemini-2.5-flash",
      metadata: { attempts, category: category || 'random' },
    });

    return new Response(JSON.stringify(joke), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating joke:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate joke' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
