import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailDelay, logRateLimitInfo, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNewsletterRequest {
  campaignId: string;
  testMode?: boolean; // If true, only sends to test email addresses
}

function mergeInlineStyle(tag: string, styleToAdd: string): string {
  if (/style\s*=\s*"/i.test(tag)) {
    return tag.replace(/style\s*=\s*"([^"]*)"/i, (_m, existing) => {
      const trimmed = String(existing ?? "").trim();
      const needsSemicolon = trimmed.length > 0 && !trimmed.endsWith(";");
      const sep = trimmed.length === 0 ? "" : needsSemicolon ? "; " : " ";
      return `style="${trimmed}${sep}${styleToAdd}"`;
    });
  }

  return tag.replace(/\/?>(?=\s*$)/, (end) => ` style="${styleToAdd}"${end}`);
}

function styleStandardTablesOnly(html: string): string {
  // Only touch tables inside the *campaign body* (not header/footer) and skip magazine two-column tables AND column layout tables.
  return (html || "").replace(
    /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)[\s\S]*?<\/table>/gi,
    (tableHtml) => {
      let updated = tableHtml.replace(
        /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)[^>]*>/i,
        (tableTag) =>
          mergeInlineStyle(
            tableTag,
            "width:100%;border-collapse:collapse;table-layout:auto;"
          )
      );

      updated = updated.replace(/<th\b[^>]*>/gi, (thTag) =>
        mergeInlineStyle(
          thTag,
          "padding:6px 10px;vertical-align:top;text-align:left;font-weight:700;"
        )
      );
      updated = updated.replace(/<td\b[^>]*>/gi, (tdTag) =>
        mergeInlineStyle(
          tdTag,
          "padding:6px 10px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;"
        )
      );

      return updated;
    }
  );
}

/**
 * Apply fluid-hybrid responsive design for column layout tables that have data-mobile-stack="true".
 * This technique wraps each column in an inline-block container that flows naturally
 * on mobile devices, stacking vertically without requiring CSS media queries.
 * Tables without data-mobile-stack will remain as fixed-width side-by-side columns.
 */
function styleColumnLayoutTables(html: string): string {
  // First, handle tables with data-mobile-stack="true" - apply fluid-hybrid layout
  let result = (html || "").replace(
    /<table\b([^>]*data-mobile-stack\s*=\s*["']true["'][^>]*data-columns\s*=\s*["'](\d+)["'][^>]*|[^>]*data-columns\s*=\s*["'](\d+)["'][^>]*data-mobile-stack\s*=\s*["']true["'][^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, colCount1, colCount2, tableContent) => {
      const columnCount = colCount1 || colCount2;
      const numColumns = parseInt(columnCount, 10);
      if (numColumns <= 0) return fullMatch;

      // Calculate column width for desktop (e.g., 2 cols = 300px each in 600px container)
      const colMaxWidth = Math.floor(600 / numColumns);

      // Extract all <td> contents
      const tdContents: string[] = [];
      const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
      let match;
      while ((match = tdRegex.exec(tableContent)) !== null) {
        tdContents.push(match[1]);
      }

      if (tdContents.length === 0) return fullMatch;

      // Build fluid-hybrid structure: each column is an inline-block div
      const columnDivs = tdContents.map((content) => {
        // Style images inside each column
        const styledContent = content.replace(/<img\b[^>]*>/gi, (imgTag) =>
          mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
        );

        return `<!--[if mso]><td valign="top" width="${colMaxWidth}"><![endif]-->
<div style="display:inline-block;width:100%;max-width:${colMaxWidth}px;vertical-align:top;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 8px 16px 8px;vertical-align:top;">${styledContent}</td>
    </tr>
  </table>
</div>
<!--[if mso]></td><![endif]-->`;
      }).join("\n");

      // Wrap in a container table for email clients
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
  <tr>
    <td align="center" style="font-size:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><![endif]-->
      ${columnDivs}
      <!--[if mso]></tr></table><![endif]-->
    </td>
  </tr>
</table>`;
    }
  );

  // Then, handle remaining data-columns tables (without mobile-stack) - apply fixed layout styling only
  result = result.replace(
    /<table\b([^>]*data-columns\s*=\s*["'](\d+)["'][^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, columnCount, tableContent) => {
      // Skip if already processed (contains mso comments)
      if (fullMatch.includes('<!--[if mso]>')) return fullMatch;
      
      // Apply standard table styling without fluid-hybrid transformation
      const styledContent = tableContent.replace(/<img\b[^>]*>/gi, (imgTag: string) =>
        mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
      );
      
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;table-layout:fixed;border-collapse:collapse;">${styledContent}</table>`;
    }
  );

  return result;
}

/**
 * Inline-styles paragraphs and headings inside [data-styled-box] elements 
 * so they render compactly in email clients (no extra vertical spacing).
 */
function styleStyledBoxes(html: string): string {
  // Process each styled-box element
  return (html || "").replace(
    /<([a-z0-9]+)\b[^>]*data-styled-box[^>]*>[\s\S]*?<\/\1>/gi,
    (boxHtml) => {
      // Remove margin from paragraphs inside styled boxes
      let updated = boxHtml.replace(/<p\b[^>]*>/gi, (pTag) =>
        mergeInlineStyle(pTag, "margin:0;")
      );
      // Remove margin from headings inside styled boxes
      updated = updated.replace(/<h[1-6]\b[^>]*>/gi, (hTag) =>
        mergeInlineStyle(hTag, "margin:0;")
      );
      return updated;
    }
  );
}

function styleFooterImages(html: string): string {
  return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
    mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
  );
}

/**
 * Style empty paragraphs (spacers) as 12px height for consistent email rendering.
 * Matches paragraphs containing only whitespace, &nbsp;, or <br> tags.
 */
function styleEmptyParagraphs(html: string): string {
  return (html || "").replace(
    /<p\b([^>]*)>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi,
    (match, attrs) => {
      const existingAttrs = attrs || "";
      if (/style\s*=\s*"/i.test(existingAttrs)) {
        const newAttrs = existingAttrs.replace(
          /style\s*=\s*"([^"]*)"/i,
          (_m: string, existing: string) => {
            const trimmed = (existing || "").trim();
            const sep = trimmed.length === 0 ? "" : trimmed.endsWith(";") ? " " : "; ";
            return `style="${trimmed}${sep}margin:0;height:12px;line-height:12px;"`;
          }
        );
        return `<p${newAttrs}></p>`;
      }
      return `<p${existingAttrs} style="margin:0;height:12px;line-height:12px;"></p>`;
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: adminCheck } = await supabaseClient
      .rpc("has_admin_access", { _user_id: user.id });

    if (!adminCheck) {
      throw new Error("Admin access required");
    }

    const { campaignId, testMode = false }: SendNewsletterRequest = await req.json();

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Fetch header and footer settings
    const { data: headerData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_header")
      .single();

    const { data: footerData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_footer")
      .single();

    const { data: orgData } = await supabaseClient
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "newsletter_organization")
      .single();

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign already sent or sending");
    }

    // Update campaign status to sending
    await supabaseClient
      .from("newsletter_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Fetch subscribers based on target audience
    const targetAudience = campaign.target_audience || { type: 'all' };
    let subscribers = [];

    if (targetAudience.type === 'all') {
      // Get all active subscribers
      let query = supabaseClient
        .from('newsletter_subscribers')
        .select('email, id, user_id')
        .eq('status', 'active');

      // In test mode, only send to test email addresses
      if (testMode) {
        query = query.or('email.like.emailtest-%,email.like.sub1-%,email.like.sub2-%,email.like.active-%,email.like.unsub-%,email.like.newsletter-test-%');
      }

      const { data, error: subscribersError } = await query;

      if (subscribersError) {
        console.error('Error fetching subscribers:', subscribersError);
        throw subscribersError;
      }
      subscribers = data || [];
    } else if (targetAudience.type === 'all_site_members') {
      // Get all site members from profiles
      let query = supabaseClient
        .from('profiles')
        .select('email, id');

      // In test mode, only send to test email addresses
      if (testMode) {
        query = query.or('email.like.emailtest-%,email.like.test@%,email.like.guardian@%,email.like.bestie@%,email.like.sponsor@%,email.like.vendor@%');
      }

      const { data, error: profilesError } = await query;

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      // Transform to match subscriber format
      subscribers = (data || []).map(profile => ({
        email: profile.email,
        id: null,
        user_id: profile.id
      }));
    } else if (targetAudience.type === 'non_subscribers') {
      // Get all site members who are NOT active newsletter subscribers
      const { data: allProfiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('email, id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get active newsletter subscribers
      const { data: activeSubscribers, error: subsError } = await supabaseClient
        .from('newsletter_subscribers')
        .select('user_id, email')
        .eq('status', 'active');

      if (subsError) {
        console.error('Error fetching subscribers:', subsError);
        throw subsError;
      }

      // Create a Set of subscribed user IDs and emails for fast lookup
      const subscribedUserIds = new Set(
        (activeSubscribers || []).map(s => s.user_id).filter(Boolean)
      );
      const subscribedEmails = new Set(
        (activeSubscribers || []).map(s => s.email).filter(Boolean)
      );

      // Filter out anyone who is subscribed
      let nonSubscribers = (allProfiles || []).filter(profile => 
        !subscribedUserIds.has(profile.id) && !subscribedEmails.has(profile.email)
      );

      // In test mode, only send to test email addresses
      if (testMode) {
        nonSubscribers = nonSubscribers.filter(profile => 
          profile.email?.includes('emailtest-') || 
          profile.email?.includes('test@') ||
          profile.email?.includes('guardian@') ||
          profile.email?.includes('bestie@') ||
          profile.email?.includes('sponsor@') ||
          profile.email?.includes('vendor@')
        );
      }

      // Transform to match subscriber format
      subscribers = nonSubscribers.map(profile => ({
        email: profile.email,
        id: null,
        user_id: profile.id
      }));
    } else if (targetAudience.type === 'roles' && targetAudience.roles?.length > 0) {
      // Get subscribers with specific roles
      let query = supabaseClient
        .from('newsletter_subscribers')
        .select('email, id, user_id')
        .eq('status', 'active')
        .not('user_id', 'is', null);

      // In test mode, only send to test email addresses
      if (testMode) {
        query = query.or('email.like.emailtest-%,email.like.sub1-%,email.like.sub2-%,email.like.active-%,email.like.unsub-%,email.like.newsletter-test-%');
      }

      const { data, error: subscribersError } = await query;

      if (subscribersError) {
        console.error('Error fetching subscribers:', subscribersError);
        throw subscribersError;
      }

      // Filter by roles - fetch user roles for each subscriber
      const subscribersWithRoles = await Promise.all(
        (data || []).map(async (sub: any) => {
          const { data: userRoles } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', sub.user_id);
          
          const hasMatchingRole = userRoles?.some((ur: any) => 
            targetAudience.roles.includes(ur.role)
          );
          
          return hasMatchingRole ? sub : null;
        })
      );

      subscribers = subscribersWithRoles.filter(Boolean);
    } else if (targetAudience.type === 'specific_emails' && targetAudience.emails?.length > 0) {
      // Send to specific email addresses (useful for testing)
      console.log('Sending to specific emails:', targetAudience.emails);
      subscribers = targetAudience.emails.map((email: string) => ({
        email: email.trim(),
        id: null,
        user_id: null
      }));
    }

    if (!subscribers || subscribers.length === 0) {
      await supabaseClient
        .from("newsletter_campaigns")
        .update({ status: "failed" })
        .eq("id", campaignId);
      throw new Error("No subscribers found");
    }

    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add campaign content (apply email-safe formatting to tables, styled boxes, and empty paragraphs)
    htmlContent += styleEmptyParagraphs(styleStyledBoxes(styleColumnLayoutTables(styleStandardTablesOnly(campaign.html_content))));
    
    // Add footer if enabled
    if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
      htmlContent += styleFooterImages(footerData.setting_value.html);
    }

    // Get organization info (needed for placeholders)
    const orgInfo = orgData?.setting_value as any;
    const orgName = orgInfo?.name || "Best Day Ministries";
    const orgAddress = orgInfo?.address || "Your Address Here";
    const fromEmail = orgInfo?.from_email || "newsletter@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    // Replace content placeholders
    const siteUrl = Deno.env.get("SITE_URL") || "https://bestdayministries.org";
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear().toString();
    
    htmlContent = htmlContent.replace(/{{site_url}}/g, siteUrl);
    htmlContent = htmlContent.replace(/{{organization_name}}/g, orgName);
    htmlContent = htmlContent.replace(/{{month}}/g, currentMonth);
    htmlContent = htmlContent.replace(/{{year}}/g, currentYear);

    // Replace links with tracked versions
    const linkRegex = /href="(https?:\/\/[^"]+)"/g;
    const links: { original: string; shortCode: string }[] = [];
    let match;

    const originalHtml = htmlContent;
    while ((match = linkRegex.exec(originalHtml)) !== null) {
      const originalUrl = match[1];
      const shortCode = crypto.randomUUID().split("-")[0];
      
      // Store link in database
      await supabaseClient.from("newsletter_links").insert({
        campaign_id: campaignId,
        original_url: originalUrl,
        short_code: shortCode,
      });

      links.push({ original: originalUrl, shortCode });
      
      // Replace in HTML
      const trackingUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-newsletter-click?code=${shortCode}`;
      htmlContent = htmlContent.replace(
        `href="${originalUrl}"`,
        `href="${trackingUrl}"`
      );
    }

    // Replace placeholders in subject line (reuse date variables from content replacements)
    let finalSubject = campaign.subject
      .replace(/{{organization_name}}/g, orgName)
      .replace(/{{month}}/g, currentMonth)
      .replace(/{{year}}/g, currentYear);

    // Add unsubscribe link
    htmlContent += `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe-newsletter?id={{subscriber_id}}" style="color: #666;">Unsubscribe</a></p>
        <p>${orgName}<br/>${orgAddress.replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    // Send via Resend with rate limiting (Resend allows 2 req/sec)
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    let sentCount = 0;
    let failedCount = 0;

    // Log estimated time for transparency
    logRateLimitInfo('send-newsletter', subscribers.length);

    // Process emails sequentially with rate limiting to respect Resend's 2 req/sec limit
    for (let i = 0; i < subscribers.length; i++) {
      const subscriber = subscribers[i] as { email: string; id: string | null; user_id: string | null };
      const subscriberId = subscriber.id || 'unknown';
      const personalizedHtml = htmlContent.replace(/{{subscriber_id}}/g, subscriberId);
      
      try {
        // Rate limiting: wait between sends
        if (i > 0) {
          await emailDelay(RESEND_RATE_LIMIT_MS);
        }

        const { data: emailData, error } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: subscriber.email,
          subject: finalSubject,
          html: personalizedHtml,
          headers: {
            "X-Campaign-ID": campaignId,
            "X-Subscriber-ID": subscriberId,
          },
        });

        if (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          
          // Log failed send
          await supabaseClient.from("newsletter_emails_log").insert({
            campaign_id: campaignId,
            recipient_email: subscriber.email,
            recipient_user_id: subscriber.user_id,
            subject: finalSubject,
            html_content: personalizedHtml,
            status: "failed",
            error_message: error.message || String(error),
            metadata: { subscriber_id: subscriber.id },
          });
          
          failedCount++;
          continue;
        }

        // Log successful send
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: campaignId,
          recipient_email: subscriber.email,
          recipient_user_id: subscriber.user_id,
          subject: finalSubject,
          html_content: personalizedHtml,
          status: "sent",
          resend_email_id: emailData?.id,
          metadata: { subscriber_id: subscriber.id },
        });

        // Log send event for analytics
        await supabaseClient.from("newsletter_analytics").insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          event_type: "sent",
        });

        sentCount++;
        
        // Log progress every 50 emails
        if ((i + 1) % 50 === 0) {
          console.log(`[send-newsletter] Progress: ${i + 1}/${subscribers.length} emails processed`);
        }
      } catch (error: any) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        
        // Log failed send
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: campaignId,
          recipient_email: subscriber.email,
          recipient_user_id: subscriber.user_id,
          subject: finalSubject,
          html_content: personalizedHtml,
          status: "failed",
          error_message: error.message || String(error),
          metadata: { subscriber_id: subscriber.id },
        });
        
        failedCount++;
      }
    }

    console.log(`[send-newsletter] Complete: ${sentCount} sent, ${failedCount} failed`);

    // Update campaign status
    await supabaseClient
      .from("newsletter_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to_count: sentCount,
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount,
        totalSubscribers: subscribers.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});