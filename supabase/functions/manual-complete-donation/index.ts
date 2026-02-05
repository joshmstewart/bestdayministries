import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ManualCompleteRequest {
  donationId: string;
  stripePaymentIntentId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'owner'].includes(roleData.role)) {
      throw new Error('Admin access required');
    }

    const { donationId, stripePaymentIntentId }: ManualCompleteRequest = await req.json();

    console.log('Manually completing donation:', donationId);

    // Get the donation
    const { data: donation, error: fetchError } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    if (fetchError || !donation) {
      throw new Error('Donation not found');
    }

    console.log('Found donation:', donation);

    // Get donor email from profile if not in donation record
    let donorEmail = donation.donor_email;
    if (!donorEmail && donation.donor_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', donation.donor_id)
        .single();
      
      donorEmail = profile?.email;
    }

    if (!donorEmail) {
      throw new Error('Cannot create receipt: donor email not found');
    }

    // Update donation status
    const newStatus = donation.frequency === 'one-time' ? 'completed' : 'active';
    const { error: updateError } = await supabaseAdmin
      .from('donations')
      .update({ 
        status: newStatus,
        ...(donation.frequency === 'monthly' && { started_at: new Date().toISOString() })
      })
      .eq('id', donationId);

    if (updateError) {
      console.error('Error updating donation:', updateError);
      throw updateError;
    }

    console.log(`Updated donation status to: ${newStatus}`);

    // Log the completion to receipt_generation_logs
    const { error: logStartError } = await supabaseAdmin
      .from('receipt_generation_logs')
      .insert({
        donation_id: donationId,
        stage: 'manual_completion_started',
        status: 'success',
        metadata: { method: 'manual-complete-donation', admin_user: user.id }
      });

    if (logStartError) {
      console.error('Error logging manual completion start:', logStartError);
    }

    // Create receipt record
    const transactionId = stripePaymentIntentId || `manual-${Date.now()}`;
    const receiptAmount = donation.amount_charged || donation.amount;
    const { data: receiptRecord, error: receiptError } = await supabaseAdmin
      .from('sponsorship_receipts')
      .insert({
        sponsorship_id: donationId,
        sponsor_email: donorEmail,
        sponsor_name: donorEmail.split('@')[0],
        bestie_name: 'General Support',
        amount: receiptAmount,
        frequency: donation.frequency,
        transaction_id: transactionId,
        transaction_date: new Date().toISOString(),
        receipt_number: `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        tax_year: new Date().getFullYear(),
        stripe_mode: donation.stripe_mode || 'live',
        user_id: donation.donor_id,
      })
      .select()
      .single();

    if (receiptError) {
      // Check if it's a duplicate
      if (receiptError.code === '23505') {
        console.log('Receipt already exists for this transaction');
      } else {
        console.error('Error creating receipt:', receiptError);
        throw receiptError;
      }
    } else {
      console.log('Receipt record created:', receiptRecord.id);

      // Log receipt creation
      const { error: logReceiptError } = await supabaseAdmin
        .from('receipt_generation_logs')
        .insert({
          donation_id: donationId,
          receipt_id: receiptRecord.id,
          stage: 'receipt_created',
          status: 'success',
          metadata: { transaction_id: transactionId }
        });

      if (logReceiptError) {
        console.error('Error logging receipt creation:', logReceiptError);
      }

      // Send receipt email
      try {
        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            sponsorEmail: donorEmail,
            bestieName: 'General Support',
            amount: receiptAmount,
            frequency: donation.frequency,
            transactionId: transactionId,
            transactionDate: new Date().toISOString(),
            stripeMode: donation.stripe_mode || 'live',
          }),
        });

        const emailResult = await emailResponse.json();
        console.log('Receipt email sent:', emailResult);

        // Log email sent
        await supabaseAdmin
          .from('receipt_generation_logs')
          .insert({
            donation_id: donationId,
            receipt_id: receiptRecord.id,
            stage: 'email_sent',
            status: 'success',
            metadata: { resend_email_id: emailResult.emailId }
          });
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
        
        // Log email failure
        await supabaseAdmin
          .from('receipt_generation_logs')
          .insert({
            donation_id: donationId,
            receipt_id: receiptRecord.id,
            stage: 'email_failed',
            status: 'error',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          });
        
        throw emailError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Donation ${donationId} manually completed and receipt sent to ${donorEmail}`,
        donation: { ...donation, status: newStatus }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in manual-complete-donation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
