import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating daily scratch cards for all users...');

    // Get current time in MST (UTC-7)
    const now = new Date();
    const utcTime = now.getTime();
    const mstTime = utcTime - (7 * 60 * 60 * 1000);
    const mstDate = new Date(mstTime);
    const today = mstDate.toISOString().split('T')[0];
    
    // Calculate tomorrow's midnight in MST, then convert to UTC for storage
    const tomorrowMST = new Date(mstDate);
    tomorrowMST.setUTCDate(tomorrowMST.getUTCDate() + 1);
    tomorrowMST.setUTCHours(0, 0, 0, 0);
    // Add 7 hours to convert MST midnight back to UTC
    const tomorrowUTC = new Date(tomorrowMST.getTime() + (7 * 60 * 60 * 1000));

    // Get active collection
    const { data: activeCollection, error: collectionError } = await supabase
      .from('sticker_collections')
      .select('id')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('display_order')
      .limit(1)
      .single();

    if (collectionError || !activeCollection) {
      console.log('No active collection found');
      return new Response(
        JSON.stringify({ message: 'No active collection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all user IDs from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) {
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users`);

    let created = 0;
    let skipped = 0;

    // Create scratch cards for each user
    for (const profile of profiles || []) {
      const { error: insertError } = await supabase
        .from('daily_scratch_cards')
        .insert({
          user_id: profile.id,
          date: today,
          collection_id: activeCollection.id,
          expires_at: tomorrowUTC.toISOString(),
        })
        .select();

      if (insertError) {
        // Card already exists for today
        if (insertError.code === '23505') {
          skipped++;
        } else {
          console.error(`Error creating card for user ${profile.id}:`, insertError);
        }
      } else {
        created++;
      }
    }

    console.log(`Created ${created} cards, skipped ${skipped} existing cards`);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        skipped,
        total: profiles?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});