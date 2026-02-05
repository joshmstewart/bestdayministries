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
    console.log('Setting up test sponsorship data...');

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test user IDs
    const TEST_BESTIE_ID = '4e8f1bc2-690e-41bd-9517-0531a1308b5a';
    const TEST_SUPPORTER_ID = '4895279f-fa64-46b4-92ad-9c3cdc69a594';

    // First, check if sponsor_bestie already exists for Test Bestie
    console.log('Checking for existing sponsor_bestie record...');
    const { data: existingBestie } = await supabaseAdmin
      .from('sponsor_besties')
      .select('id')
      .eq('bestie_id', TEST_BESTIE_ID)
      .single();

    let sponsorBestie;
    if (existingBestie) {
      console.log('Updating existing sponsor_bestie record...');
      const { data, error: updateError } = await supabaseAdmin
        .from('sponsor_besties')
        .update({
          bestie_name: 'Test Bestie',
          is_active: true,
          is_public: true,
          monthly_goal: 100,
          approval_status: 'approved',
          image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
          aspect_ratio: '1:1'
        })
        .eq('id', existingBestie.id)
        .select()
        .single();

      if (updateError) throw updateError;
      sponsorBestie = data;
    } else {
      console.log('Creating new sponsor_bestie record...');
      const { data, error: insertError } = await supabaseAdmin
        .from('sponsor_besties')
        .insert({
          bestie_id: TEST_BESTIE_ID,
          bestie_name: 'Test Bestie',
          is_active: true,
          is_public: true,
          monthly_goal: 100,
          approval_status: 'approved',
          image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
          aspect_ratio: '1:1',
          created_by: TEST_SUPPORTER_ID
        })
        .select()
        .single();

      if (insertError) throw insertError;
      sponsorBestie = data;
    }

    console.log('Sponsor bestie created/updated:', sponsorBestie.id);

    // Now check if sponsorship exists
    console.log('Checking for existing sponsorship record...');
    const { data: existingSponsorship } = await supabaseAdmin
      .from('sponsorships')
      .select('id')
      .eq('sponsor_id', TEST_SUPPORTER_ID)
      .eq('sponsor_bestie_id', sponsorBestie.id)
      .single();

    let sponsorship;
    if (existingSponsorship) {
      console.log('Updating existing sponsorship record...');
      const { data, error: updateError } = await supabaseAdmin
        .from('sponsorships')
        .update({
          bestie_id: TEST_BESTIE_ID,
          amount: 25.00,
          frequency: 'monthly',
          status: 'active',
          stripe_mode: 'test',
          started_at: new Date().toISOString()
        })
        .eq('id', existingSponsorship.id)
        .select()
        .single();

      if (updateError) throw updateError;
      sponsorship = data;
    } else {
      console.log('Creating new sponsorship record...');
      const { data, error: insertError } = await supabaseAdmin
        .from('sponsorships')
        .insert({
          sponsor_id: TEST_SUPPORTER_ID,
          bestie_id: TEST_BESTIE_ID,
          sponsor_bestie_id: sponsorBestie.id,
          amount: 25.00,
          frequency: 'monthly',
          status: 'active',
          stripe_mode: 'test',
          started_at: new Date().toISOString(),
          stripe_customer_id: 'test_cus_' + Date.now(),
          stripe_subscription_id: 'test_sub_' + Date.now()
        })
        .select()
        .single();

      if (insertError) throw insertError;
      sponsorship = data;
    }

    console.log('Sponsorship created/updated:', sponsorship.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test sponsorship setup complete',
        data: {
          sponsor_bestie_id: sponsorBestie.id,
          sponsorship_id: sponsorship.id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error setting up test sponsorship:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
