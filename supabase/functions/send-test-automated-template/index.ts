import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTestRequest {
  templateId: string;
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

function styleStandardTablesOnly(html: string): string {
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
 * Style magazine (multi-column) layout tables for email rendering.
 * These tables keep fixed column layout (no stacking) to preserve the design.
 * Dynamically calculates column widths based on actual number of columns.
 */
function styleMagazineLayouts(html: string): string {
  return (html || "").replace(
    /<table\b([^>]*data-two-column[^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, attrs, tableContent) => {
      // Skip if already processed
      if (fullMatch.includes('<!--[if mso]>')) return fullMatch;

      // Extract table-level styles from attributes
      const tableStyleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
      const tableStyle = tableStyleMatch?.[1] || '';
      
      // Count the actual number of columns by finding td elements in the first row
      const rowMatch = tableContent.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
      let columnCount = 2; // Default fallback
      if (rowMatch) {
        const tdMatches = rowMatch[1].match(/<td\b[^>]*>/gi);
        if (tdMatches) {
          columnCount = tdMatches.length;
        }
      }
      
      // Calculate the percentage width for each column
      const columnWidth = Math.floor(100 / columnCount);
      
      // Style images inside the table
      let styledContent = tableContent.replace(/<img\b[^>]*>/gi, (imgTag: string) =>
        mergeInlineStyle(imgTag, "width:100%;height:auto;display:block;")
      );

      // Ensure td elements have proper styling with dynamic width
      styledContent = styledContent.replace(/<td\b([^>]*)>/gi, (tdTag: string, tdAttrs: string) => {
        return mergeInlineStyle(tdTag, `width:${columnWidth}%;vertical-align:top;`);
      });

      // Build the styled table with fixed layout
      let wrapperStyle = 'max-width:600px;margin:16px auto;border-collapse:collapse;table-layout:fixed;width:100%;';
      
      // Preserve existing background, padding, border-radius from the original table
      const bgMatch = tableStyle.match(/background-color:\s*([^;]+)/i);
      if (bgMatch) {
        wrapperStyle += `background-color:${bgMatch[1].trim()};`;
      }
      const paddingMatch = tableStyle.match(/padding:\s*([^;]+)/i);
      if (paddingMatch) {
        wrapperStyle += `padding:${paddingMatch[1].trim()};`;
      }
      const borderRadiusMatch = tableStyle.match(/border-radius:\s*([^;]+)/i);
      if (borderRadiusMatch) {
        wrapperStyle += `border-radius:${borderRadiusMatch[1].trim()};`;
      }

      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${wrapperStyle}">${styledContent}</table>`;
    }
  );
}

function styleFooterImages(html: string): string {
  return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
    mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("send-test-automated-template: Starting function execution");

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

    const { templateId, testEmail }: SendTestRequest = await req.json();
    console.log(`Sending test email for template ${templateId} to ${testEmail}`);

    // Fetch template details
    const { data: template, error: templateError } = await supabaseClient
      .from("campaign_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
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

    // Helper to escape regex special characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace placeholders with sample data for testing
    let processedContent = template.content;
    let processedSubject = template.subject;
    
    // Sample data for different trigger types
    const sampleData: Record<string, Record<string, string>> = {
      vendor_application: {
        VENDOR_EMAIL: "test@example.com",
        BUSINESS_NAME: "Test Business (Special Chars: + * ? ^ $ { } | [ ] \\)",
        VENDOR_NAME: "Test Vendor",
        DESCRIPTION: "This is a sample vendor description for testing purposes.",
      },
      vendor_approved: {
        VENDOR_EMAIL: "approved@example.com",
        BUSINESS_NAME: "Approved Business LLC",
        VENDOR_NAME: "Approved Vendor",
      },
      vendor_rejected: {
        VENDOR_EMAIL: "rejected@example.com",
        BUSINESS_NAME: "Rejected Business Inc",
        VENDOR_NAME: "Rejected Vendor",
      },
      newsletter_signup: {
        EMAIL: "subscriber@example.com",
        NAME: "Test Subscriber",
      },
      site_signup: {
        EMAIL: "newuser@example.com",
        NAME: "New User",
      },
    };
    
    // Get sample data for this template's trigger or use empty object
    const triggerData = sampleData[template.trigger_event || ""] || {};
    
    // Replace placeholders with sample data
    Object.keys(triggerData).forEach((key) => {
      const placeholder = `[${key.toUpperCase()}]`;
      const escapedPlaceholder = escapeRegex(placeholder);
      const value = triggerData[key] || '';
      processedSubject = processedSubject.replace(new RegExp(escapedPlaceholder, 'g'), value);
      processedContent = processedContent.replace(new RegExp(escapedPlaceholder, 'g'), value);
    });

    // Construct final HTML with header and footer
    let htmlContent = "";
    
    // Add header if enabled
    if (headerData?.setting_value?.enabled && headerData?.setting_value?.html) {
      htmlContent += headerData.setting_value.html;
    }
    
    // Add processed template content (apply email-safe formatting to column layouts, magazine layouts, and standard tables)
    htmlContent += styleMagazineLayouts(styleColumnLayoutTables(styleStandardTablesOnly(processedContent)));
    
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

    // Add test notice
    htmlContent = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 20px; border-radius: 4px; color: #856404;">
        <strong>⚠️ TEST EMAIL</strong> - This is a test version of your automated email template. This would normally be sent automatically when the trigger event occurs.
      </div>
    ` + htmlContent;

    htmlContent += `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="#" style="color: #666;">Unsubscribe</a></p>
        <p>${orgName}<br/>${orgAddress.replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    // Send via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { data: emailData, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: testEmail,
      subject: `[TEST] ${processedSubject}`,
      html: htmlContent,
    });

    if (sendError) {
      console.error("Failed to send test email:", sendError);
      
      // Log failed test send
      const { error: logError } = await supabaseClient.from("newsletter_emails_log").insert({
        template_id: templateId,
        recipient_email: testEmail,
        recipient_user_id: user.id,
        subject: `[TEST] ${processedSubject}`,
        html_content: htmlContent,
        status: "failed",
        error_message: sendError.message || String(sendError),
        metadata: { is_test: true, template_name: template.name },
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
      template_id: templateId,
      recipient_email: testEmail,
      recipient_user_id: user.id,
      subject: `[TEST] ${processedSubject}`,
      html_content: htmlContent,
      status: "sent",
      resend_email_id: emailData?.id,
      metadata: { is_test: true, template_name: template.name },
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
    console.error("Error in send-test-automated-template:", error);
    
    // Try to log the error if we have the necessary info
    try {
      const body = await req.clone().json();
      if (body.templateId && body.testEmail) {
        await supabaseClient.from("newsletter_emails_log").insert({
          template_id: body.templateId,
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
