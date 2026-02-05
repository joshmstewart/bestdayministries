import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Wrapper edge function that adds retry logic to seed-email-test-data
 * 
 * This provides:
 * - Exponential backoff retry (3 attempts)
 * - 60s timeout per attempt
 * - Better error logging
 * - Service role key verification
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting seed-email-test-data with retry logic...');
    
    // Verify service role key is set
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set');
      throw new Error('Service role key not configured');
    }
    
    const requestBody = await req.text();
    const maxRetries = 3;
    const baseTimeout = 60000; // 60s per attempt
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📍 Attempt ${attempt}/${maxRetries}...`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), baseTimeout);
        
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/seed-email-test-data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: requestBody,
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Attempt ${attempt} failed: ${response.status} ${errorText}`);
          throw new Error(`Seed function returned ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`✅ Attempt ${attempt} succeeded!`);
        
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} error:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error('❌ All retry attempts failed');
    throw lastError || new Error('All retry attempts failed');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Seed with retry failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: 'All retry attempts exhausted'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
