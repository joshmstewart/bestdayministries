import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const createUserSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  displayName: z.string().trim().min(1).max(100),
  role: z.enum(['admin', 'owner', 'caregiver', 'bestie', 'supporter', 'vendor']),
  subscribeToNewsletter: z.boolean().optional().default(true),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an owner/admin using user_roles table
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('Auth error:', authError);
    console.log('Requesting user:', requestingUser?.id);

    if (authError || !requestingUser) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit: 10 user creations per hour
    const { data: rateLimitOk } = await supabaseAdmin.rpc('check_rate_limit', {
      _user_id: requestingUser.id,
      _endpoint: 'create-user',
      _max_requests: 10,
      _window_minutes: 60
    });

    if (!rateLimitOk) {
      console.log(`Rate limit exceeded for user ${requestingUser.id} on create-user`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check role from user_roles table
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    console.log('User role query error:', roleError);
    console.log('User role:', userRole?.role);

    if (!['owner', 'admin'].includes(userRole?.role || '')) {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can create users', role: userRole?.role }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input. Please check your data and try again.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, displayName, role, subscribeToNewsletter } = validation.data;

    console.log('Creating user:', { email, displayName, role, subscribeToNewsletter });
    console.log('Role is vendor:', role === 'vendor');

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        role: role,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: The trigger handle_new_user() will automatically:
    // 1. Create profile entry
    // 2. Insert role into user_roles table
    
    // If the role is vendor, also create a vendor record with approved status
    if (role === 'vendor') {
      console.log('Creating vendor record for user:', newUser.user.id);
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          user_id: newUser.user.id,
          business_name: `${displayName}'s Store`,
          status: 'approved'
        });

      if (vendorError) {
        console.error('Error creating vendor record:', vendorError);
        // Don't fail the entire operation, just log it
      } else {
        console.log('Vendor record created successfully');
      }
    }

    // Subscribe to newsletter if requested
    if (subscribeToNewsletter) {
      console.log('Subscribing user to newsletter:', email);
      const { error: newsletterError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .upsert({
          email,
          user_id: newUser.user.id,
          status: 'active',
          source: 'admin_created',
        }, { onConflict: 'email' });

      if (newsletterError) {
        console.error('Error subscribing to newsletter:', newsletterError);
        // Don't fail the entire operation, just log it
      } else {
        console.log('Newsletter subscription created successfully');
        
        // Trigger welcome email
        try {
          await supabaseAdmin.functions.invoke('send-automated-campaign', {
            body: { 
              trigger_event: 'newsletter_signup', 
              recipient_email: email,
              trigger_data: { source: 'admin_created' }
            }
          });
          console.log('Welcome email triggered successfully');
        } catch (emailError) {
          console.error('Error triggering welcome email:', emailError);
          // Don't fail - newsletter subscription was successful
        }
      }
    }
    
    console.log('User created successfully:', newUser.user.id);

    return new Response(
      JSON.stringify({ user: newUser.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});