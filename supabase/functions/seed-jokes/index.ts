import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 20, category = 'random' } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing jokes to avoid duplicates (including answers for semantic matching)
    const { data: existingJokes } = await supabase
      .from('joke_library')
      .select('question, answer');
    
    const existingQuestions = new Set(
      (existingJokes || []).map(j => j.question.toLowerCase().trim())
    );

    // Create a sample of existing jokes to help AI avoid similar concepts
    const sampleExisting = (existingJokes || [])
      .slice(0, 100) // Sample first 100 for context
      .map(j => `Q: ${j.question} A: ${j.answer}`)
      .join('\n');

    const categoryPrompt = category && category !== 'random' 
      ? `All jokes should be about: ${category}.` 
      : 'Mix of different topics like animals, food, school, work, sports, weather, etc.';

    // Generate jokes in batch
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
            content: `You are creating VERY SIMPLE jokes for adults with intellectual disabilities and their families.

CRITICAL RULES:
- Use ONLY simple, everyday words (no technical terms, no abstract concepts)
- Answers should be obvious and easy to understand
- Use concrete, visual things people can picture (animals, food, everyday objects)
- NO complex wordplay or puns that require spelling knowledge
- Keep sentences SHORT (under 10 words each)
- The humor should come from silly, obvious connections

GOOD EXAMPLES:
- "Why did the banana go to the doctor?" → "Because it wasn't peeling well!" (simple, visual)
- "What do you call a sleeping dinosaur?" → "A dino-snore!" (easy sound connection)
- "Why are fish so smart?" → "Because they live in schools!" (concrete concept)

BAD EXAMPLES (DO NOT USE):
- Jokes requiring spelling backward (like "Edam = made")
- Jokes about technology, apps, or computers
- Jokes with multiple meanings that are hard to get
- Anything requiring specialized knowledge

${categoryPrompt}

CRITICAL - AVOID DUPLICATES:
These jokes ALREADY EXIST in the library. Do NOT generate anything similar to these (same concept, same punchline pattern, or slight rewording):
${sampleExisting}

Generate EXACTLY ${count} COMPLETELY UNIQUE jokes that:
1. Have different subjects than the existing jokes
2. Use different punchlines/wordplay than the existing jokes
3. Are NOT slight rewordings of existing jokes

IMPORTANT: Respond ONLY with a valid JSON array in this exact format:
[
  {"question": "Why did the chicken cross the playground?", "answer": "To get to the other slide!", "category": "animals"},
  {"question": "What do cows read in the morning?", "answer": "The moos-paper!", "category": "animals"}
]

No other text, just the JSON array.`
          },
          {
            role: 'user',
            content: `Generate ${count} COMPLETELY NEW and unique corny jokes that are DIFFERENT from all existing jokes!`
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

    // Parse JSON, stripping markdown if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const jokes = JSON.parse(jsonContent.trim());
    
    if (!Array.isArray(jokes)) {
      throw new Error('Response is not an array');
    }

    // Filter out duplicates and insert new jokes
    const newJokes = jokes.filter(
      (joke: { question: string }) => !existingQuestions.has(joke.question.toLowerCase().trim())
    );

    let inserted = 0;
    let duplicates = 0;

    for (const joke of newJokes) {
      const { error } = await supabase
        .from('joke_library')
        .insert({
          question: joke.question,
          answer: joke.answer,
          category: joke.category || category || 'random'
        });
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          duplicates++;
        } else {
          console.error('Insert error:', error);
        }
      } else {
        inserted++;
      }
    }

    // Log AI usage
    await logAiUsage({
      functionName: "seed-jokes",
      model: "google/gemini-2.5-flash",
      metadata: { requestedCount: count, generated: jokes.length, inserted, duplicates: duplicates + (jokes.length - newJokes.length), category },
    });

    return new Response(JSON.stringify({
      success: true,
      generated: jokes.length,
      inserted,
      duplicates: duplicates + (jokes.length - newJokes.length),
      message: `Added ${inserted} new jokes to the library!`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error seeding jokes:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to seed jokes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
