import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SITE_URL, SENDERS } from "../_shared/domainConstants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  user_id: string;
  user_email: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  event_image_url: string | null;
  event_link_url: string | null;
  event_link_label: string | null;
}

// Helper to add delay between API calls (respect Resend's 2 req/sec limit)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email sending');
      return new Response(
        JSON.stringify({ success: true, message: 'Email sending skipped - no API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unprocessed queue items with retry_count < 3 (limit to prevent timeout)
    const { data: queueItems, error: fetchError } = await supabase
      .from('event_email_queue')
      .select('*')
      .eq('processed', false)
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No emails to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get app settings for branding
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['logo_url', 'mobile_app_name']);

    const logoUrl = appSettings?.find(s => s.setting_key === 'logo_url')?.setting_value || '';
    const appName = appSettings?.find(s => s.setting_key === 'mobile_app_name')?.setting_value || 'Best Day Ever';

    let processed = 0;
    let errors = 0;

    for (const item of queueItems as QueueItem[]) {
      try {
        // Rate limiting: wait 500ms between sends (Resend allows 2 req/sec)
        await delay(500);
        
        const eventDate = new Date(item.event_date);
        const formattedDate = eventDate.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Denver' // Mountain Time
        });

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${appName}" style="max-width: 150px; margin-bottom: 20px;">` : ''}
            
            <h1 style="color: #E07A41; margin-bottom: 20px;">New Event: ${item.event_title}</h1>
            
            <p>A new event has been posted that you might be interested in!</p>
            
            ${item.event_image_url ? `
            <div style="margin: 20px 0;">
              <img src="${item.event_image_url}" alt="${item.event_title}" style="max-width: 100%; height: auto; border-radius: 8px;">
            </div>
            ` : ''}
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #333;">${item.event_title}</h2>
              <p style="margin: 10px 0;"><strong>📅 When:</strong> ${formattedDate}</p>
              <p style="margin: 10px 0;"><strong>📍 Where:</strong> ${item.event_location || 'Location TBD'}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <a href="${SITE_URL}/community?eventId=${item.event_id}" 
                 style="display: inline-block; background-color: #E07A41; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">
                View Event Details
              </a>
              ${item.event_link_url ? `
              <a href="${item.event_link_url}" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                ${item.event_link_label || 'Learn More'}
              </a>
              ` : ''}
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              You're receiving this email because you have event notifications enabled. 
              <a href="${SITE_URL}/profile" style="color: #E07A41;">Manage your notification preferences</a>
            </p>
          </body>
          </html>
        `;

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Best Day Ministries <notifications@bestdayministries.org>',
            to: [item.user_email],
            subject: `New Event: ${item.event_title}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        // Mark as processed
        await supabase
          .from('event_email_queue')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', item.id);

        // Log the email
        await supabase
          .from('email_notifications_log')
          .insert({
            user_id: item.user_id,
            notification_type: 'new_event',
            subject: `New Event: ${item.event_title}`,
            status: 'sent',
            metadata: { event_id: item.event_id }
          });

        processed++;
      } catch (emailError) {
        console.error(`Error sending email to ${item.user_email}:`, emailError);
        
        // Get current retry count
        const currentRetryCount = (item as any).retry_count || 0;
        const newRetryCount = currentRetryCount + 1;
        
        // Only mark as processed if max retries reached (3 attempts)
        const shouldMarkProcessed = newRetryCount >= 3;
        
        await supabase
          .from('event_email_queue')
          .update({ 
            processed: shouldMarkProcessed, 
            processed_at: shouldMarkProcessed ? new Date().toISOString() : null,
            retry_count: newRetryCount,
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          .eq('id', item.id);

        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        message: `Processed ${processed} emails with ${errors} errors` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing event email queue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
