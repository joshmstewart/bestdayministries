import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get existing jokes to avoid duplicates
    const { data: existingJokes } = await supabase
      .from('joke_library')
      .select('question');
    
    const existingQuestions = new Set(
      (existingJokes || []).map(j => j.question.toLowerCase().trim())
    );

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
            content: `You are a joke generator creating family-friendly, corny jokes like those found on Laffy Taffy wrappers, bubble gum wrappers, or popsicle sticks.

These are simple Q&A format jokes with a question and a punny answer. Keep them SHORT and SILLY.

${categoryPrompt}

Generate EXACTLY ${count} unique jokes. Make sure each joke is different!

IMPORTANT: Respond ONLY with a valid JSON array in this exact format:
[
  {"question": "Why did the cookie go to the doctor?", "answer": "Because it was feeling crummy!", "category": "food"},
  {"question": "What do you call a fish without eyes?", "answer": "A fsh!", "category": "animals"}
]

No other text, just the JSON array.`
          },
          {
            role: 'user',
            content: `Generate ${count} unique corny jokes!`
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
