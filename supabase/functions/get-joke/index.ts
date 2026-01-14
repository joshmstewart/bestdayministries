import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JokeResult {
  id: string;
  question: string;
  answer: string;
  category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get an unseen joke from the library
    const { data, error } = await supabase
      .rpc('get_random_unseen_joke', {
        _user_id: userId,
        _category: category === 'random' ? null : category
      });

    if (error) {
      console.error('Error fetching joke:', error);
      throw new Error('Failed to fetch joke from library');
    }

    const joke = data?.[0] as JokeResult | undefined;

    if (joke) {
      // Record that user has seen this joke
      await supabase
        .from('user_joke_history')
        .insert({ user_id: userId, joke_question: joke.question });

      // Increment times_served
      await supabase
        .from('joke_library')
        .update({ times_served: supabase.rpc('increment', { x: 1 }) })
        .eq('id', joke.id);

      return new Response(JSON.stringify({
        question: joke.question,
        answer: joke.answer,
        fromLibrary: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No unseen jokes available - return a message
    return new Response(JSON.stringify({
      error: 'all_jokes_seen',
      message: "You've seen all our jokes! Check back later for new ones."
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-joke:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get joke' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
