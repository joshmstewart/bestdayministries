import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received Sentry webhook:', JSON.stringify(payload).substring(0, 500));

    // Extract event from Sentry alert webhook payload structure
    // Sentry sends: { action: "triggered", data: { event: {...} } }
    const event = payload.data?.event || payload.event || payload;
    const exception = event.exception?.values?.[0];
    
    console.log('Parsed event:', {
      hasException: !!exception,
      message: event.message,
      eventId: event.event_id,
      title: event.title
    });
    
    const errorData = {
      error_message: event.title || exception?.value || event.message || 'Unknown error',
      error_type: exception?.type || event.type || 'error',
      stack_trace: exception?.stacktrace ? JSON.stringify(exception.stacktrace) : null,
      user_id: event.user?.id || null,
      user_email: event.user?.email || null,
      browser_info: event.contexts?.browser || null,
      url: event.request?.url || null,
      sentry_event_id: event.event_id || null,
      severity: event.level || 'error',
      environment: event.environment || 'production',
      metadata: {
        tags: event.tags || {},
        contexts: event.contexts || {},
        sdk: event.sdk || {},
        culprit: event.culprit || null,
        location: event.location || null
      }
    };

    // Insert error log into database
    const { error } = await supabase
      .from('error_logs')
      .insert(errorData);

    if (error) {
      console.error('Error inserting error log:', error);
      throw error;
    }

    console.log('Error log created successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Error logged successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in sentry-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
