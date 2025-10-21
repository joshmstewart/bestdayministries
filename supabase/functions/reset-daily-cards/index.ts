import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'owner');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get scope from request body (default to 'admins' for backward compatibility)
    const body = await req.json().catch(() => ({}));
    const scope = body.scope || 'admins'; // 'self', 'admins', or 'all'

    console.log(`Resetting daily scratch cards - scope: ${scope}`);

    // Calculate MST date (UTC-7) - must match frontend calculation exactly
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    const today = mstTime.toISOString().split('T')[0];
    
    console.log('Using MST date for reset:', today);

    let targetUserIds: string[] = [];
    let scopeMessage = '';

    if (scope === 'self') {
      // Reset only for current user
      targetUserIds = [user.id];
      scopeMessage = 'your';
    } else if (scope === 'admins') {
      // Get all admin and owner user IDs
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'owner']);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
        throw adminError;
      }

      targetUserIds = adminUsers?.map(u => u.user_id) || [];
      scopeMessage = 'all admin/owner';
    } else if (scope === 'all') {
      // Reset for all users - delete both scratch cards AND collected stickers
      const { error: deleteCardsError, count: cardsCount } = await supabase
        .from('daily_scratch_cards')
        .delete({ count: 'exact' })
        .eq('date', today);

      if (deleteCardsError) {
        console.error('Error deleting cards:', deleteCardsError);
        throw deleteCardsError;
      }

      // Also delete all user stickers to fully reset collections
      const { error: deleteStickersError, count: stickersCount } = await supabase
        .from('user_stickers')
        .delete({ count: 'exact' });

      if (deleteStickersError) {
        console.error('Error deleting stickers:', deleteStickersError);
        throw deleteStickersError;
      }

      console.log(`Reset ${cardsCount} scratch cards and ${stickersCount} stickers for all users`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Reset ${cardsCount} daily scratch cards and ${stickersCount} stickers for all users. Everyone can now get new cards and rebuild collections.`,
          deleted_cards: cardsCount,
          deleted_stickers: stickersCount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users found to reset cards for.',
          deleted_count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete scratch cards for target users for today
    const { error: deleteCardsError, count: cardsCount } = await supabase
      .from('daily_scratch_cards')
      .delete({ count: 'exact' })
      .eq('date', today)
      .in('user_id', targetUserIds);

    if (deleteCardsError) {
      console.error('Error deleting cards:', deleteCardsError);
      throw deleteCardsError;
    }

    // Also delete all user stickers for target users to fully reset their collections
    const { error: deleteStickersError, count: stickersCount } = await supabase
      .from('user_stickers')
      .delete({ count: 'exact' })
      .in('user_id', targetUserIds);

    if (deleteStickersError) {
      console.error('Error deleting stickers:', deleteStickersError);
      throw deleteStickersError;
    }

    console.log(`Reset ${cardsCount} scratch cards and ${stickersCount} stickers for ${scopeMessage} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset ${cardsCount} daily scratch cards and ${stickersCount} stickers for ${scopeMessage} users. Collections have been fully reset.`,
        deleted_cards: cardsCount,
        deleted_stickers: stickersCount
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
