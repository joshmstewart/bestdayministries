import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as sharedCorsHeaders } from '../_shared/corsHeaders.ts';
import { logProviderVerification, verifyProviderSignature } from '../_shared/webhookVerification.ts';

const corsHeaders = {
  ...sharedCorsHeaders,
  'Access-Control-Allow-Headers': `${sharedCorsHeaders['Access-Control-Allow-Headers']}, sentry-hook-signature`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    logProviderVerification('sentry', verifyProviderSignature(
      'sentry', rawBody, req.headers.get('Sentry-Hook-Signature'), Deno.env.get('SENTRY_WEBHOOK_SECRET'),
    ));
    // Deliberately LOG-ONLY until signed provider delivery is confirmed.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = JSON.parse(new TextDecoder().decode(rawBody));

    // Extract event from Sentry alert webhook payload structure
    // Sentry sends: { action: "triggered", data: { event: {...} } }
    const event = payload.data?.event || payload.event || payload;
    const exception = event.exception?.values?.[0];
    
    
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
    console.error('[sentry-webhook] processing failed');
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
