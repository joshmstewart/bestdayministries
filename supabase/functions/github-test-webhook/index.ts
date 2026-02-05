import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Received GitHub webhook:', JSON.stringify(payload).substring(0, 500));

    // Extract relevant data from GitHub Actions webhook
    const workflowRun = payload.workflow_run || payload;
    
    const testRunData = {
      status: workflowRun.conclusion || workflowRun.status || 'pending',
      workflow_name: workflowRun.name || 'Automated Tests',
      commit_sha: workflowRun.head_sha || workflowRun.head_commit?.id || 'unknown',
      commit_message: workflowRun.head_commit?.message || workflowRun.display_title || null,
      branch: workflowRun.head_branch || 'main',
      run_id: String(workflowRun.id || Date.now()),
      run_url: workflowRun.html_url || workflowRun.url || '',
      duration_seconds: workflowRun.run_duration_ms ? Math.round(workflowRun.run_duration_ms / 1000) : null,
      metadata: {
        event: payload.action || 'unknown',
        actor: workflowRun.actor?.login || workflowRun.triggering_actor?.login,
        repository: payload.repository?.full_name,
        workflow_id: workflowRun.workflow_id,
        attempt: workflowRun.run_attempt || 1
      }
    };

    console.log('Inserting test run:', testRunData);

    const { data, error } = await supabase
      .from('test_runs')
      .insert([testRunData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Test run saved successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to process GitHub webhook'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
