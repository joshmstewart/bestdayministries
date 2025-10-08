import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@2.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
} from 'npm:@react-email/components@0.0.22';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  userId: string;
  notificationType: string;
  subject: string;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

// Email styles
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const logoSection = {
  padding: '30px 20px 20px',
  textAlign: 'center' as const,
};

const logo = {
  maxWidth: '150px',
  height: 'auto',
};

const content = {
  padding: '20px 40px',
};

const h1 = {
  margin: '0 0 20px',
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
};

const text = {
  margin: '0 0 20px',
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#4a4a4a',
  whiteSpace: 'pre-line' as const,
};

const buttonContainer = {
  marginTop: '30px',
  textAlign: 'center' as const,
};

const button = {
  display: 'inline-block',
  padding: '14px 28px',
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  fontSize: '16px',
};

const footer = {
  padding: '20px 40px',
  backgroundColor: '#f9f9f9',
  borderTop: '1px solid #eeeeee',
};

const footerText = {
  margin: '0',
  fontSize: '14px',
  color: '#888888',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#888888',
  textDecoration: 'underline',
};

// Base email template component
const createEmailTemplate = (props: {
  preview: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  logoUrl?: string;
  appUrl: string;
}) => {
  return React.createElement(Html, {},
    React.createElement(Head, {}),
    React.createElement(Preview, {}, props.preview),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        props.logoUrl && React.createElement(Section, { style: logoSection },
          React.createElement(Img, { src: props.logoUrl, alt: "Logo", style: logo })
        ),
        React.createElement(Section, { style: content },
          React.createElement(Heading, { style: h1 }, props.title),
          React.createElement(Text, { style: text }, props.message),
          props.actionUrl && React.createElement(Section, { style: buttonContainer },
            React.createElement(Link, { href: props.actionUrl, style: button },
              props.actionText || "View Details"
            )
          )
        ),
        React.createElement(Section, { style: footer },
          React.createElement(Text, { style: footerText },
            "You received this email because you have notifications enabled in your settings.",
            React.createElement('br', {}),
            React.createElement(Link, { href: `${props.appUrl}/profile`, style: footerLink },
              "Manage preferences"
            )
          )
        )
      )
    )
  );
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: NotificationEmailRequest = await req.json();

    console.log("Processing notification email:", requestData);

    // Get user email and display name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", requestData.userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found or email not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check notification preferences
    const { data: preferences } = await supabase.rpc("get_notification_preferences", {
      _user_id: requestData.userId,
    });

    const prefs = preferences?.[0] || {};

    // Map notification type to preference field
    const preferenceMap: { [key: string]: string } = {
      pending_approval: "email_on_pending_approval",
      approval_decision: "email_on_approval_decision",
      new_sponsor_message: "email_on_new_sponsor_message",
      message_approved: "email_on_message_approved",
      message_rejected: "email_on_message_rejected",
      new_sponsorship: "email_on_new_sponsorship",
      sponsorship_update: "email_on_sponsorship_update",
      comment_on_post: "email_on_comment_on_post",
      comment_on_thread: "email_on_comment_on_thread",
      new_event: "email_on_new_event",
      event_update: "email_on_event_update",
    };

    const preferenceField = preferenceMap[requestData.notificationType];
    const shouldSendEmail = preferenceField ? prefs[preferenceField] !== false : true;

    if (!shouldSendEmail) {
      console.log(`Email notifications disabled for ${requestData.notificationType}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app logo
    const { data: appSettings } = await supabase
      .from("app_settings_public")
      .select("setting_value")
      .eq("setting_key", "logo_url")
      .single();

    const logoUrl = appSettings?.setting_value || "";
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const actionUrl = requestData.link ? `${appUrl}${requestData.link}` : undefined;

    // Customize message and title based on notification type
    let emailTitle = requestData.title;
    let emailMessage = requestData.message;
    let actionText = "View Details";

    switch (requestData.notificationType) {
      case "approval_decision":
        const status = requestData.metadata?.status || "approved";
        emailTitle = status === 'approved' 
          ? `Your ${requestData.metadata?.itemType || 'post'} was approved! 🎉`
          : `Your ${requestData.metadata?.itemType || 'post'} needs revision`;
        actionText = `View ${requestData.metadata?.itemType || 'post'}`;
        break;

      case "new_sponsor_message":
        emailTitle = "You have a new message! 💌";
        emailMessage = `${requestData.metadata?.senderName || 'A sponsor'} sent you a message${requestData.metadata?.messageSubject ? ` about "${requestData.metadata.messageSubject}"` : ''}:\n\n${requestData.message}`;
        actionText = "Read Message";
        break;

      case "new_sponsorship":
        emailTitle = "New Sponsorship! 🎉";
        const frequency = requestData.metadata?.frequency === 'monthly' ? 'monthly' : 'one-time';
        emailMessage = `${requestData.metadata?.sponsorName || 'A supporter'} has started a ${frequency} sponsorship of $${requestData.metadata?.amount?.toFixed(2) || '0.00'} for ${requestData.metadata?.bestieName || 'you'}. Thank you for your support!`;
        actionText = "View Sponsorship";
        break;

      case "comment_on_post":
        emailTitle = "New comment on your post 💬";
        emailMessage = `${requestData.metadata?.commenterName || 'Someone'} commented on "${requestData.metadata?.postTitle || 'your post'}":\n\n${requestData.message}`;
        actionText = "View Comment";
        break;

      case "comment_on_thread":
        emailTitle = "New reply on a discussion you're following 💬";
        emailMessage = `${requestData.metadata?.commenterName || 'Someone'} also commented on "${requestData.metadata?.postTitle || 'a discussion'}":\n\n${requestData.message}`;
        actionText = "View Comment";
        break;

      case "new_event":
        emailTitle = `New Event: ${requestData.metadata?.eventTitle || requestData.title} 📅`;
        emailMessage = `${requestData.message}\n\nWhen: ${requestData.metadata?.eventDate || ''}${requestData.metadata?.eventLocation ? `\nWhere: ${requestData.metadata.eventLocation}` : ''}`;
        actionText = "View Event Details";
        break;

      case "event_update":
        emailTitle = `Event Update: ${requestData.metadata?.eventTitle || requestData.title} 📅`;
        actionText = "View Event Details";
        break;
    }

    // Generate email HTML using React Email template
    const emailComponent = createEmailTemplate({
      preview: requestData.subject,
      title: emailTitle,
      message: emailMessage,
      actionUrl,
      actionText,
      logoUrl,
      appUrl,
    });

    const html = await renderAsync(emailComponent);

    // Send email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Notifications <notifications@resend.dev>",
      to: [profile.email],
      subject: requestData.subject,
      html,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      
      // Log failure
      await supabase.from("email_notifications_log").insert({
        user_id: requestData.userId,
        recipient_email: profile.email,
        notification_type: requestData.notificationType,
        subject: requestData.subject,
        status: "failed",
        error_message: emailError.message,
        metadata: requestData.metadata,
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    // Log success
    await supabase.from("email_notifications_log").insert({
      user_id: requestData.userId,
      recipient_email: profile.email,
      notification_type: requestData.notificationType,
      subject: requestData.subject,
      status: "sent",
      metadata: {
        ...requestData.metadata,
        email_id: emailData?.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);