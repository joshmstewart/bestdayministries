import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { applyEmailStyles, styleFooterImages } from "../_shared/emailStyles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendTestRequest {
  campaignId: string;
  testEmail: string;
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

/**
 * Ensure CTA button tables have explicit inline styles for Gmail.
 * Gmail strips inherited styles, so buttons need explicit font-size, padding, colors.
 */
function styleCTAButtons(html: string): string {
  return (html || "").replace(
    /<table\b([^>]*data-cta-button[^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, tableContent) => {
      // Ensure the anchor has explicit styles
      let updated = fullMatch.replace(
        /<a\b([^>]*)>/gi,
        (aTag, aAttrs) => {
          // Check if it already has inline styles
          if (/style\s*=\s*"/i.test(aTag)) {
            // Merge in font-family to ensure Gmail doesn't use default
            return aTag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
              if (!/font-family/i.test(existing)) {
                return `style="${existing};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;"`;
              }
              return m;
            });
          }
          return aTag.replace('>', ` style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">`);
        }
      );
      return updated;
    }
  );
}

/**
 * Normalize typography for all text elements to ensure Gmail renders consistently.
 */
function normalizeTypography(html: string): string {
  // Add explicit font-size to paragraphs and headings that don't have it
  let result = html;
  
  // Paragraphs: ensure 16px base size
  result = result.replace(/<p\b([^>]*)>/gi, (pTag, attrs) => {
    if (/style\s*=\s*"/i.test(pTag)) {
      return pTag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
        if (!/font-size/i.test(existing)) {
          return `style="${existing};font-size:16px;line-height:1.5;"`;
        }
        return m;
      });
    }
    return `<p${attrs} style="font-size:16px;line-height:1.5;margin:0 0 1em 0;">`;
  });
  
  // H1: 32px
  result = result.replace(/<h1\b([^>]*)>/gi, (tag, attrs) => {
    if (/style\s*=\s*"/i.test(tag)) {
      return tag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
        if (!/font-size/i.test(existing)) {
          return `style="${existing};font-size:32px;line-height:1.2;font-weight:bold;"`;
        }
        return m;
      });
    }
    return `<h1${attrs} style="font-size:32px;line-height:1.2;font-weight:bold;margin:0 0 0.5em 0;">`;
  });
  
  // H2: 24px
  result = result.replace(/<h2\b([^>]*)>/gi, (tag, attrs) => {
    if (/style\s*=\s*"/i.test(tag)) {
      return tag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
        if (!/font-size/i.test(existing)) {
          return `style="${existing};font-size:24px;line-height:1.3;font-weight:bold;"`;
        }
        return m;
      });
    }
    return `<h2${attrs} style="font-size:24px;line-height:1.3;font-weight:bold;margin:0 0 0.5em 0;">`;
  });
  
  // H3: 20px
  result = result.replace(/<h3\b([^>]*)>/gi, (tag, attrs) => {
    if (/style\s*=\s*"/i.test(tag)) {
      return tag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
        if (!/font-size/i.test(existing)) {
          return `style="${existing};font-size:20px;line-height:1.4;font-weight:bold;"`;
        }
        return m;
      });
    }
    return `<h3${attrs} style="font-size:20px;line-height:1.4;font-weight:bold;margin:0 0 0.5em 0;">`;
  });
  
  return result;
}

function styleStandardTablesOnly(html: string): string {
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
}

/**
 * Apply fluid-hybrid responsive design for column layout tables that have data-mobile-stack="true".
 * This technique wraps each column in an inline-block container that flows naturally
 * on mobile devices, stacking vertically without requiring CSS media queries.
 * Tables without data-mobile-stack will remain as fixed-width side-by-side columns.
 * 
 * Gmail-specific fixes:
 * - Use explicit width attributes (not just max-width)
 * - Avoid font-size:0 trick (Gmail strips it) - use letter-spacing:0 instead
 * - Use table cells for columns in non-stacking mode
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
    <td align="center" style="font-size:0;letter-spacing:0;word-spacing:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><![endif]-->
      ${columnDivs}
      <!--[if mso]></tr></table><![endif]-->
    </td>
  </tr>
</table>`;
    }
  );

  // Then, handle remaining data-columns tables (without mobile-stack) - use fixed table cells for Gmail
  result = result.replace(
    /<table\b([^>]*data-columns\s*=\s*["'](\d+)["'][^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, columnCount, tableContent) => {
      // Skip if already processed (contains mso comments)
      if (fullMatch.includes('<!--[if mso]>')) return fullMatch;
      
      const numColumns = parseInt(columnCount, 10);
      if (numColumns <= 0) return fullMatch;
      
      // Calculate column width percentage
      const colWidthPercent = Math.floor(100 / numColumns);
      
      // Extract all <td> contents
      const tdContents: string[] = [];
      const tdRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
      let match;
      while ((match = tdRegex.exec(tableContent)) !== null) {
        tdContents.push(match[1]);
      }
      
      if (tdContents.length === 0) return fullMatch;
      
      // Build table cells with explicit widths for Gmail
      const tableCells = tdContents.map((content) => {
        const styledContent = content.replace(/<img\b[^>]*>/gi, (imgTag: string) =>
          mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
        );
        return `<td style="width:${colWidthPercent}%;padding:0 8px;vertical-align:top;">${styledContent}</td>`;
      }).join("");
      
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;table-layout:fixed;border-collapse:collapse;">
  <tr>${tableCells}</tr>
</table>`;
    }
  );

  return result;
}

/**
 * Style magazine (multi-column) layout tables for email rendering.
 * These tables keep fixed column layout (no stacking) to preserve the design.
 * Dynamically calculates column widths based on actual number of columns.
 */
/**
 * Style magazine (multi-column) layout tables for email rendering.
 * Uses fixed table-cell layout for Gmail compatibility (not inline-block).
 * Dynamically calculates column widths based on actual number of columns.
 */
function styleMagazineLayouts(html: string): string {
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
      const colWidthPercent = Math.floor(100 / numColumns);

      // Build table cells with explicit widths for Gmail (not inline-block)
      const tableCells = tdSegments
        .map((tdHtml) => {
          const rawContent = getTdInnerHtml(tdHtml);
          const styledContent = rawContent.replace(/<img\b[^>]*>/gi, (imgTag: string) =>
            mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
          );

          return `<td style="width:${colWidthPercent}%;padding:0 8px;vertical-align:top;">${styledContent}</td>`;
        })
        .join("");

      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:16px auto;table-layout:fixed;border-collapse:collapse;">
  <tr>
    <td style="${wrapperTdStyle}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;border-collapse:collapse;">
        <tr>${tableCells}</tr>
      </table>
    </td>
  </tr>
</table>`;
    }
  );
}

// styleFooterImages is now imported from _shared/emailStyles.ts

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("send-test-newsletter: Starting function execution");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      throw new Error("No user found");
    }

    console.log(`User authenticated: ${user.id}`);

    const { data: adminCheck } = await supabaseClient
      .rpc("has_admin_access", { _user_id: user.id });

    if (!adminCheck) {
      console.error(`User ${user.id} is not an admin`);
      throw new Error("Admin access required");
    }

    const { campaignId, testEmail }: SendTestRequest = await req.json();
    console.log(`Sending test email for campaign ${campaignId} to ${testEmail}`);

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

    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add campaign content (apply email-safe formatting for Gmail: typography, buttons, layouts)
    htmlContent += applyEmailStyles(campaign.html_content);
    
    // Add footer if enabled
    if (footerData?.setting_value?.enabled && footerData?.setting_value?.html) {
      htmlContent += styleFooterImages(footerData.setting_value.html);
    }

    // Get organization info
    const orgInfo = orgData?.setting_value as any;
    const orgName = orgInfo?.name || "Best Day Ministries";
    const orgAddress = orgInfo?.address || "Your Address Here";
    const fromEmail = orgInfo?.from_email || "newsletter@bestdayministries.org";
    const fromName = orgInfo?.from_name || "Best Day Ministries";

    // Replace placeholders (match production send behavior)
    const siteUrl = Deno.env.get("SITE_URL") || "https://bestdayministries.org";
    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear().toString();

    htmlContent = htmlContent
      .replace(/{{site_url}}/g, siteUrl)
      .replace(/{{organization_name}}/g, orgName)
      .replace(/{{month}}/g, currentMonth)
      .replace(/{{year}}/g, currentYear);

    const finalSubject = `[TEST] ${(campaign.subject || "")
      .replace(/{{organization_name}}/g, orgName)
      .replace(/{{month}}/g, currentMonth)
      .replace(/{{year}}/g, currentYear)}`;

    // Add test notice and unsubscribe footer
    htmlContent = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; border-radius: 4px; color: #856404;">
        <strong>⚠️ TEST EMAIL</strong> - This is a test version of your newsletter. Links are real, but click/open tracking is disabled in test mode.
      </div>
    ` + htmlContent;

    htmlContent += `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="#" style="color: #666;">Unsubscribe</a></p>
        <p>${orgName}<br/>${orgAddress.replace(/\n/g, '<br/>')}</p>
      </div>
    `;

     // Normalize base typography so delivered emails match preview sizing more closely.
     htmlContent = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;">${htmlContent}</div>`;

    // Send via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { data: emailData, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testEmail,
      subject: finalSubject,
      html: htmlContent,
    });

    if (sendError) {
      console.error("Failed to send test email:", sendError);

      // Log failed test send
      const { error: logError } = await supabaseClient.from("newsletter_emails_log").insert({
        campaign_id: campaignId,
        recipient_email: testEmail,
        recipient_user_id: user.id,
        subject: finalSubject,
        html_content: htmlContent,
        status: "failed",
        error_message: sendError.message || String(sendError),
        metadata: { is_test: true },
      });

      if (logError) {
        console.error("Failed to log error to database:", logError);
      } else {
        console.log("Failed send logged to database");
      }

      throw sendError;
    }

    console.log("Test email sent successfully via Resend");

    // Log successful test send
    const { error: logError } = await supabaseClient.from("newsletter_emails_log").insert({
      campaign_id: campaignId,
      recipient_email: testEmail,
      recipient_user_id: user.id,
      subject: finalSubject,
      html_content: htmlContent,
      status: "sent",
      resend_email_id: emailData?.id,
      metadata: { is_test: true },
    });

    if (logError) {
      console.error("Failed to log success to database:", logError);
      // Don't throw - email was sent successfully
    } else {
      console.log("Successful send logged to database");
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Test email sent to ${testEmail}`,
        logged: !logError
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-test-newsletter:", error);
    
    // Try to log the error if we have the necessary info
    try {
      const body = await req.clone().json();
      if (body.campaignId && body.testEmail) {
        await supabaseClient.from("newsletter_emails_log").insert({
          campaign_id: body.campaignId,
          recipient_email: body.testEmail,
          subject: "[TEST] Email Send Failed",
          status: "failed",
          error_message: error.message || String(error),
          metadata: { is_test: true, error_type: "function_error" },
        });
        console.log("Error logged to database");
      }
    } catch (logError) {
      console.error("Could not log error to database:", logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Check edge function logs for more information"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});