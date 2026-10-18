import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// SDK releases can omit runtime headers sent by newer browser clients.
export const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Allow-Headers': `${sdkCorsHeaders['Access-Control-Allow-Headers']}, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-test-functions-secret`,
};