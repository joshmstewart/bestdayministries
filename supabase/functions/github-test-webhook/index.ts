import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/corsHeaders.ts';
import { verifyGitHubTestSecret } from '../_shared/webhookVerification.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!await verifyGitHubTestSecret(req, Deno.env.get('TEST_FUNCTIONS_SECRET'))) {
      console.info('[github-test-webhook] authorization denied');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();

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
    console.error('[github-test-webhook] processing failed');
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
