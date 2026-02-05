import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting sticker collection updates...');

    // Run GA promotion
    console.log('Promoting collections to GA...');
    const { error: gaError } = await supabase.rpc('promote_collections_to_ga');
    
    if (gaError) {
      console.error('Error promoting collections to GA:', gaError);
      throw gaError;
    }

    // Update featured collections
    console.log('Updating featured collections...');
    const { error: featuredError } = await supabase.rpc('update_featured_collections');
    
    if (featuredError) {
      console.error('Error updating featured collections:', featuredError);
      throw featuredError;
    }

    // Activate collections based on start_date
    console.log('Activating collections by start date...');
    const { error: activateError } = await supabase.rpc('activate_collections_on_start_date');
    
    if (activateError) {
      console.error('Error activating collections:', activateError);
      throw activateError;
    }

    // Deactivate collections based on end_date
    console.log('Deactivating collections by end date...');
    const { error: deactivateError } = await supabase.rpc('deactivate_collections_after_end_date');
    
    if (deactivateError) {
      console.error('Error deactivating collections:', deactivateError);
      throw deactivateError;
    }

    console.log('Sticker collection updates completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sticker collection updates completed',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in update-sticker-collections:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});