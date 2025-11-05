import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create receipt record
    const transactionId = stripePaymentIntentId || `manual-${Date.now()}`;
    const { data: receiptRecord, error: receiptError } = await supabaseAdmin
      .from('sponsorship_receipts')
      .insert({
        sponsor_email: donation.donor_email,
        sponsor_name: donation.donor_email.split('@')[0],
        bestie_name: 'General Support',
        amount: donation.amount,
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

      // Send receipt email
      try {
        const emailResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            sponsorEmail: donation.donor_email,
            bestieName: 'General Support',
            amount: donation.amount,
            frequency: donation.frequency,
            transactionId: transactionId,
            transactionDate: new Date().toISOString(),
            stripeMode: donation.stripe_mode || 'live',
          }),
        });

        const emailResult = await emailResponse.json();
        console.log('Receipt email sent:', emailResult);
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
        throw emailError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Donation ${donationId} manually completed and receipt sent to ${donation.donor_email}`,
        donation: { ...donation, status: newStatus }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in manual-complete-donation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
