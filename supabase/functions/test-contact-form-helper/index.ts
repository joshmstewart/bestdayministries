import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, submissionId } = await req.json();
    
    // Create admin client using service role key (available in edge functions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'waitForSubmission') {
      const startTime = Date.now();
      const timeoutMs = 30000;
      const pollIntervalMs = 2000;

      while (Date.now() - startTime < timeoutMs) {
        const { data, error } = await supabaseAdmin
          .from('contact_form_submissions')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return new Response(
            JSON.stringify({ success: true, submission: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Timeout waiting for submission' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'waitForReply') {
      const startTime = Date.now();
      const timeoutMs = 30000;
      const pollIntervalMs = 2000;

      while (Date.now() - startTime < timeoutMs) {
        const { data, error } = await supabaseAdmin
          .from('contact_form_replies')
          .select('*')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return new Response(
            JSON.stringify({ success: true, reply: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Timeout waiting for reply' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'getSubmission') {
      const { data, error } = await supabaseAdmin
        .from('contact_form_submissions')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, submission: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cleanup') {
      // Delete test submissions
      const { data: submissions } = await supabaseAdmin
        .from('contact_form_submissions')
        .select('id')
        .ilike('email', email);

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map(s => s.id);
        
        await supabaseAdmin
          .from('contact_form_replies')
          .delete()
          .in('submission_id', submissionIds);
        
        await supabaseAdmin
          .from('contact_form_submissions')
          .delete()
          .in('id', submissionIds);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in test-contact-form-helper:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
