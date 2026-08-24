import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { applyEmailStyles, styleFooterImages } from "../_shared/emailStyles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignRequest {
  trigger_event: string;
  recipient_email: string;
  recipient_user_id?: string;
  trigger_data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Automated campaign send triggered");
    
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { trigger_event, recipient_email, recipient_user_id, trigger_data = {} }: CampaignRequest = await req.json();

    if (!trigger_event || typeof trigger_event !== "string" || !recipient_email || typeof recipient_email !== "string") {
      return new Response(
        JSON.stringify({ error: "trigger_event and recipient_email are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ---------------------------------------------------------------
    // Authorization gate.
    // This endpoint sends mail from the organization's verified domain,
    // so an unauthenticated caller must never be able to pick an
    // arbitrary recipient. Three tiers:
    //   1. service-role bearer  -> trusted server caller, unrestricted
    //   2. admin/owner JWT      -> unrestricted (admin resend UI)
    //   3. other authenticated  -> recipient must be the caller's own email
    //   4. anonymous            -> only public self-service triggers, and the
    //                              recipient must be provably self-registered
    //                              within the last 15 minutes
    // ---------------------------------------------------------------
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const normalizedRecipient = recipient_email.trim().toLowerCase();

    let authorized = false;
    let authMode = "anonymous";

    if (bearer && serviceRoleKey && bearer === serviceRoleKey) {
      authorized = true;
      authMode = "service_role";
    } else if (bearer) {
      const { data: userData } = await supabaseClient.auth.getUser(bearer);
      const caller = userData?.user;
      if (caller) {
        const { data: isAdmin } = await supabaseClient.rpc("has_admin_access", { _user_id: caller.id });
        if (isAdmin) {
          authorized = true;
          authMode = "admin";
        } else if ((caller.email ?? "").toLowerCase() === normalizedRecipient) {
          authorized = true;
          authMode = "self";
        }
      }
    }

    if (!authorized) {
      // Anonymous / non-matching caller: only self-service signup triggers,
      // and only to an address that just registered itself.
      const PUBLIC_TRIGGERS = ["newsletter_signup", "site_signup", "subscription_created"];
      if (!PUBLIC_TRIGGERS.includes(trigger_event)) {
        console.warn(`⛔ Rejected unauthenticated trigger: ${trigger_event}`);
        return new Response(
          JSON.stringify({ error: "Not authorized for this trigger" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      let recipientProven = false;

      if (trigger_event === "newsletter_signup") {
        const { data } = await supabaseClient
          .from("newsletter_subscribers")
          .select("id")
          .ilike("email", normalizedRecipient)
          .gte("created_at", cutoff)
          .maybeSingle();
        recipientProven = !!data;
      } else if (trigger_event === "site_signup") {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id")
          .ilike("email", normalizedRecipient)
          .gte("created_at", cutoff)
          .maybeSingle();
        recipientProven = !!data;
      } else if (trigger_event === "subscription_created") {
        const { data } = await supabaseClient
          .from("sponsorships")
          .select("id")
          .ilike("sponsor_email", normalizedRecipient)
          .gte("created_at", cutoff)
          .maybeSingle();
        recipientProven = !!data;
      }

      if (!recipientProven) {
        console.warn(`⛔ Rejected unverified recipient for ${trigger_event}`);
        return new Response(
          JSON.stringify({ error: "Recipient could not be verified for this trigger" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      authMode = "public_signup";
    }

    console.log(`🔐 Authorized as ${authMode} for event: ${trigger_event}`);


    // Check for duplicate sends within last 24 hours to prevent spam
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSend } = await supabaseClient
      .from("automated_campaign_sends")
      .select("id, created_at")
      .eq("recipient_email", recipient_email)
      .eq("trigger_event", trigger_event)
      .eq("status", "sent")
      .gte("created_at", twentyFourHoursAgo)
      .maybeSingle();

    if (recentSend) {
      console.log(`⏭️ Skipping duplicate send - same email (${recipient_email}) and trigger (${trigger_event}) was sent at ${recentSend.created_at}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Skipped - duplicate email within 24 hours",
          skipped: true,
          previous_send_at: recentSend.created_at
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Find active template for this trigger event
    const { data: template, error: templateError } = await supabaseClient
      .from("campaign_templates")
      .select("*")
      .eq("trigger_event", trigger_event)
      .eq("is_active", true)
      .eq("auto_send", true)
      .maybeSingle();

    if (templateError) {
      console.error("Template query error:", templateError);
      throw templateError;
    }

    if (!template) {
      console.log(`⚠️ No active template found for event: ${trigger_event}`);
      return new Response(
        JSON.stringify({ success: false, message: "No template found for this event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`✅ Found template: ${template.name}`);

    // Check if delay is needed
    if (template.delay_minutes > 0) {
      console.log(`⏱️ Delaying send by ${template.delay_minutes} minutes`);
      // In production, you'd use a job queue. For now, we'll send immediately
      // and log that a delay was requested
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

    // Replace placeholders in subject and content
    let subject = template.subject;
    let content = template.content;

    // Helper to escape regex special characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const mergeInlineStyle = (tag: string, styleToAdd: string): string => {
      if (/style\s*=\s*"/i.test(tag)) {
        return tag.replace(/style\s*=\s*"([^"]*)"/i, (_m, existing) => {
          const trimmed = String(existing ?? "").trim();
          const needsSemicolon = trimmed.length > 0 && !trimmed.endsWith(";");
          const sep = trimmed.length === 0 ? "" : needsSemicolon ? "; " : " ";
          return `style="${trimmed}${sep}${styleToAdd}"`;
        });
      }
      return tag.replace(/\/?>(?=\s*$)/, (end) => ` style="${styleToAdd}"${end}`);
    };

    const styleStandardTablesOnly = (html: string): string => {
      return (html || "").replace(
        /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)(?![^>]*data-cta-button)[\s\S]*?<\/table>/gi,
        (tableHtml) => {
          let updated = tableHtml.replace(
            /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)(?![^>]*data-cta-button)[^>]*>/i,
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
};

/**
 * Apply fluid-hybrid responsive design for column layout tables that have data-mobile-stack="true".
 * This technique wraps each column in an inline-block container that flows naturally
 * on mobile devices, stacking vertically without requiring CSS media queries.
 * Tables without data-mobile-stack will remain as fixed-width side-by-side columns.
 */
const styleColumnLayoutTables = (html: string): string => {
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
      // Use fixed width (not width:100%) to prevent desktop wrapping - columns stay side-by-side
      // until viewport shrinks below 600px where inline-block naturally stacks.
      const columnDivs = tdContents.map((content) => {
        // Style images inside each column
        const styledContent = content.replace(/<img\b[^>]*>/gi, (imgTag) =>
          mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
        );

        return `<!--[if mso]><td valign="top" width="${colMaxWidth}"><![endif]-->
<div style="display:inline-block;width:${colMaxWidth}px;max-width:100%;vertical-align:top;">
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
};

/**
 * Style magazine (multi-column) layout tables for email rendering.
 * These tables keep fixed column layout (no stacking) to preserve the design.
 * Dynamically calculates column widths based on actual number of columns.
 */
const styleMagazineLayouts = (html: string): string => {
  return (html || "").replace(
    /<table\b([^>]*data-two-column[^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, tableContent) => {
      // Skip if already processed
      if (fullMatch.includes('<!--[if mso]>')) return fullMatch;

        const extractTopLevelTdHtml = (rowInnerHtml: string): string[] => {
          const tokens = /<\/?td\b[^>]*>/gi;
          const segments: string[] = [];
          let depth = 0;
          let start = -1;
          let m: RegExpExecArray | null;

          while ((m = tokens.exec(rowInnerHtml)) !== null) {
            const tag = m[0].toLowerCase();
            const isOpen = tag.startsWith('<td');
            const isClose = tag.startsWith('</td');
            if (isOpen) {
              if (depth === 0) start = m.index;
              depth++;
            } else if (isClose) {
              depth = Math.max(0, depth - 1);
              if (depth === 0 && start >= 0) {
                segments.push(rowInnerHtml.slice(start, tokens.lastIndex));
                start = -1;
              }
            }
          }

          return segments;
        };

        const getTdInnerHtml = (tdHtml: string) =>
          tdHtml
            .replace(/^<td\b[^>]*>/i, "")
            .replace(/<\/td>\s*$/i, "");

        // Extract table-level styles from attributes
        const tableStyleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
        const tableStyle = tableStyleMatch?.[1] || '';

        const bgMatch = tableStyle.match(/background(?:-color)?:\s*([^;]+)/i);
        const paddingMatch = tableStyle.match(/padding:\s*([^;]+)/i);
        const borderRadiusMatch = tableStyle.match(/border-radius:\s*([^;]+)/i);

        const wrapperTdStyle = [
          bgMatch ? `background:${bgMatch[1].trim()};` : "",
          paddingMatch ? `padding:${paddingMatch[1].trim()};` : "padding:0;",
          borderRadiusMatch ? `border-radius:${borderRadiusMatch[1].trim()};` : "",
        ].filter(Boolean).join("");

        // Extract first row cells (top-level) so nested CTA tables don't get broken.
        const rowMatch = tableContent.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
        if (!rowMatch) return fullMatch;

        const tdSegments = extractTopLevelTdHtml(rowMatch[1]);
        if (tdSegments.length === 0) return fullMatch;

        const numColumns = tdSegments.length;
        const colMaxWidth = Math.floor(600 / numColumns);

        const columnDivs = tdSegments
          .map((tdHtml) => {
            const rawContent = getTdInnerHtml(tdHtml);
            const styledContent = rawContent.replace(/<img\b[^>]*>/gi, (imgTag: string) =>
              mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
            );

            return `<!--[if mso]><td valign="top" width="${colMaxWidth}"><![endif]-->
<div style="display:inline-block;width:100%;max-width:${colMaxWidth}px;vertical-align:top;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 8px;vertical-align:top;">${styledContent}</td>
    </tr>
  </table>
</div>
<!--[if mso]></td><![endif]-->`;
          })
          .join("\n");

        return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:16px auto;border-collapse:collapse;">
  <tr>
    <td style="${wrapperTdStyle}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td align="center" style="font-size:0;">
            <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><![endif]-->
            ${columnDivs}
            <!--[if mso]></tr></table><![endif]-->
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
    }
  );
};

/**
 * Inline-styles paragraphs and headings inside [data-styled-box] elements 
 * so they render compactly in email clients (no extra vertical spacing).
 */
const styleStyledBoxes = (html: string): string => {
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
};

const styleFooterImages = (html: string): string => {
  return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
    mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
      );
    };

// styleEmptyParagraphs is now handled by applyEmailStyles from _shared/emailStyles.ts

    // Replace common placeholders.
    // Values come from callers (including public signup flows), so they are
    // HTML-escaped before being interpolated into the email body.
    const escapeHtml = (str: string) =>
      String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    Object.keys(trigger_data).forEach((key) => {
      const placeholder = `[${key.toUpperCase()}]`;
      const escapedPlaceholder = escapeRegex(placeholder);
      const raw = trigger_data[key] ?? '';
      const safeValue = escapeHtml(raw).replace(/\$/g, "$$$$");
      subject = subject.replace(new RegExp(escapedPlaceholder, 'g'), safeValue);
      content = content.replace(new RegExp(escapedPlaceholder, 'g'), safeValue);
    });


    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add campaign content (apply email-safe formatting for Gmail: typography, buttons, layouts)
    htmlContent += applyEmailStyles(content);
    
    // Add footer if enabled
    if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
      htmlContent += styleFooterImages(footerData.setting_value.html);
    }

    // Normalize base typography so delivered emails match preview sizing more closely.
    htmlContent = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;">${htmlContent}</div>`;

    // Get organization info
    const orgInfo = orgData?.setting_value as any;
    const fromEmail = orgInfo?.from_email || "noreply@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    console.log(`📤 Sending email to: ${recipient_email}`);

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("❌ Email send error:", emailError);
      
      // Log failed send to automated_campaign_sends
      await supabaseClient.from("automated_campaign_sends").insert({
        template_id: template.id,
        recipient_email,
        recipient_user_id: recipient_user_id || null,
        trigger_event,
        trigger_data,
        status: "failed",
        error_message: emailError.message,
      });

      // Also log to newsletter_emails_log for comprehensive tracking
      await supabaseClient.from("newsletter_emails_log").insert({
        template_id: template.id,
        recipient_email,
        recipient_user_id: recipient_user_id || null,
        subject: subject,
        html_content: htmlContent,
        status: "failed",
        error_message: emailError.message,
        metadata: { 
          trigger_event, 
          trigger_data,
          template_name: template.name 
        },
      });

      throw emailError;
    }

    console.log("✅ Email sent successfully:", emailData);

    // Log successful send to automated_campaign_sends
    await supabaseClient.from("automated_campaign_sends").insert({
      template_id: template.id,
      recipient_email,
      recipient_user_id: recipient_user_id || null,
      trigger_event,
      trigger_data,
      status: "sent",
    });

    // Also log to newsletter_emails_log for comprehensive tracking
    await supabaseClient.from("newsletter_emails_log").insert({
      template_id: template.id,
      recipient_email,
      recipient_user_id: recipient_user_id || null,
      subject: subject,
      html_content: htmlContent,
      status: "sent",
      resend_email_id: emailData?.id,
      metadata: { 
        trigger_event, 
        trigger_data,
        template_name: template.name 
      },
    });

    return new Response(
      JSON.stringify({ success: true, template_used: template.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Error in send-automated-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
