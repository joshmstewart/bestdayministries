import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { emailDelay, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BroadcastRequest {
  title: string;
  message: string;
  link?: string;
  targetRoles?: string[]; // Optional: filter by user roles
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { title, message, link, targetRoles }: BroadcastRequest = await req.json();

    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    console.log('Broadcasting product update:', { title, targetRoles });

    // Get all users (or filtered by role)
    let query = supabaseClient
      .from('profiles')
      .select('id, email');

    // If targetRoles specified, join with user_roles to filter
    if (targetRoles && targetRoles.length > 0) {
      const { data: filteredUsers, error: usersError } = await supabaseClient
        .from('user_roles')
        .select('user_id, profiles!inner(id, email)')
        .in('role', targetRoles);

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      const users = filteredUsers?.map((u: any) => ({
        id: u.profiles.id,
        email: u.profiles.email
      })) || [];

      // Create notifications for filtered users
      await createNotificationsForUsers(supabaseClient, users, title, message, link);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: users.length,
          message: `Product update sent to ${users.length} user(s)` 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all users if no role filter
    const { data: users, error: usersError } = await query;

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await createNotificationsForUsers(supabaseClient, users, title, message, link);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: users.length,
        message: `Product update sent to ${users.length} user(s)` 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in broadcast-product-update function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function createNotificationsForUsers(
  supabaseClient: any,
  users: { id: string; email: string }[],
  title: string,
  message: string,
  link?: string
) {
  const notifications = users.map(user => ({
    user_id: user.id,
    type: 'product_update',
    title,
    message,
    link: link || null,
    metadata: { broadcast: true },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }));

  // Batch insert notifications (Supabase handles large batches efficiently)
  const { error: notifError } = await supabaseClient
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('Error creating notifications:', notifError);
    throw new Error(`Failed to create notifications: ${notifError.message}`);
  }

  console.log(`Created ${notifications.length} notifications`);

  // Send emails with rate limiting (Resend allows 2 req/sec)
  // Note: We intentionally await each email to respect rate limits
  console.log(`[broadcast-product-update] Sending ${users.length} emails with rate limiting...`);
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // Rate limiting: wait between sends
    if (i > 0) {
      await emailDelay(RESEND_RATE_LIMIT_MS);
    }
    
    try {
      await supabaseClient.functions.invoke('send-notification-email', {
        body: {
          userId: user.id,
          notificationType: 'product_update',
          subject: `Product Update: ${title}`,
          title,
          message,
          link,
        },
      });
    } catch (error: any) {
      console.error(`Failed to send email to ${user.email}:`, error);
      // Continue even if email fails
    }
  }
  
  console.log(`[broadcast-product-update] Finished sending emails`);
}

serve(handler);