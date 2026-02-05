import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { emailDelay, logRateLimitInfo, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";
import { applyEmailStyles, styleFooterImages } from "../_shared/emailStyles.ts";

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

// styleFooterImages and styleEmptyParagraphs are now handled by applyEmailStyles from _shared/emailStyles.ts


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

    // Helper function to fetch all rows with pagination (bypasses 1000 row limit)
    async function fetchAllPaginated<T>(
      tableName: string,
      selectColumns: string,
      filters: { column: string; operator: string; value: any }[],
      orFilter?: string
    ): Promise<T[]> {
      const pageSize = 1000;
      let allData: T[] = [];
      let page = 0;
      
      while (true) {
        let query = supabaseClient
          .from(tableName)
          .select(selectColumns)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        // Apply filters
        for (const filter of filters) {
          if (filter.operator === 'eq') {
            query = query.eq(filter.column, filter.value);
          } else if (filter.operator === 'not.is') {
            query = query.not(filter.column, 'is', filter.value);
          }
        }
        
        // Apply OR filter for test mode
        if (orFilter) {
          query = query.or(orFilter);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          break;
        }
        
        allData = [...allData, ...data as T[]];
        
        if (data.length < pageSize) {
          break;
        }
        
        page++;
      }
      
      return allData;
    }

    // Fetch subscribers based on target audience
    const targetAudience = campaign.target_audience || { type: 'all' };
    let subscribers: { email: string; id: string | null; user_id: string | null }[] = [];

    if (targetAudience.type === 'all') {
      // Get all active subscribers with pagination
      const orFilter = testMode 
        ? 'email.like.emailtest-%,email.like.sub1-%,email.like.sub2-%,email.like.active-%,email.like.unsub-%,email.like.newsletter-test-%'
        : undefined;

      const data = await fetchAllPaginated<{ email: string; id: string; user_id: string | null }>(
        'newsletter_subscribers',
        'email, id, user_id',
        [{ column: 'status', operator: 'eq', value: 'active' }],
        orFilter
      );
      
      subscribers = data;
      console.log(`Fetched ${subscribers.length} active subscribers`);
    } else if (targetAudience.type === 'all_site_members') {
      // Get all site members from profiles with pagination
      const orFilter = testMode 
        ? 'email.like.emailtest-%,email.like.test@%,email.like.guardian@%,email.like.bestie@%,email.like.sponsor@%,email.like.vendor@%'
        : undefined;

      const data = await fetchAllPaginated<{ email: string; id: string }>(
        'profiles',
        'email, id',
        [],
        orFilter
      );
      
      // Transform to match subscriber format
      subscribers = data.map(profile => ({
        email: profile.email,
        id: null,
        user_id: profile.id
      }));
      console.log(`Fetched ${subscribers.length} site members`);
    } else if (targetAudience.type === 'non_subscribers') {
      // Get all site members who are NOT active newsletter subscribers
      const allProfiles = await fetchAllPaginated<{ email: string; id: string }>(
        'profiles',
        'email, id',
        []
      );

      // Get active newsletter subscribers
      const activeSubscribers = await fetchAllPaginated<{ user_id: string | null; email: string }>(
        'newsletter_subscribers',
        'user_id, email',
        [{ column: 'status', operator: 'eq', value: 'active' }]
      );

      // Create a Set of subscribed user IDs and emails for fast lookup
      const subscribedUserIds = new Set(
        activeSubscribers.map(s => s.user_id).filter(Boolean)
      );
      const subscribedEmails = new Set(
        activeSubscribers.map(s => s.email).filter(Boolean)
      );

      // Filter out anyone who is subscribed
      let nonSubscribers = allProfiles.filter(profile => 
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
      console.log(`Fetched ${subscribers.length} non-subscribers`);
    } else if (targetAudience.type === 'roles' && targetAudience.roles?.length > 0) {
      // Get subscribers with specific roles - with pagination
      const orFilter = testMode 
        ? 'email.like.emailtest-%,email.like.sub1-%,email.like.sub2-%,email.like.active-%,email.like.unsub-%,email.like.newsletter-test-%'
        : undefined;

      const data = await fetchAllPaginated<{ email: string; id: string; user_id: string | null }>(
        'newsletter_subscribers',
        'email, id, user_id',
        [
          { column: 'status', operator: 'eq', value: 'active' },
          { column: 'user_id', operator: 'not.is', value: null }
        ],
        orFilter
      );

      // Filter by roles - fetch user roles in batches to avoid query limits
      const batchSize = 500;
      const subscribersWithRoles: { email: string; id: string; user_id: string | null }[] = [];
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const userIds = batch.map(s => s.user_id).filter(Boolean) as string[];
        
        if (userIds.length === 0) continue;
        
        const { data: roles } = await supabaseClient
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        // Create a map of user_id to roles
        const userRolesMap: Record<string, string[]> = {};
        (roles || []).forEach((r: { user_id: string; role: string }) => {
          if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
          userRolesMap[r.user_id].push(r.role);
        });
        
        // Filter batch by matching roles
        for (const sub of batch) {
          if (sub.user_id) {
            const userRoles = userRolesMap[sub.user_id] || [];
            if (targetAudience.roles.some((role: string) => userRoles.includes(role))) {
              subscribersWithRoles.push(sub);
            }
          }
        }
      }

      subscribers = subscribersWithRoles;
      console.log(`Fetched ${subscribers.length} subscribers with matching roles`);
    } else if (targetAudience.type === 'specific_emails' && targetAudience.emails?.length > 0) {
      // Send to specific email addresses (useful for testing)
      console.log('Sending to specific emails:', targetAudience.emails);
      
      // Look up subscriber IDs and user IDs for these specific emails
      const specificEmails = targetAudience.emails.map((e: string) => e.trim().toLowerCase());
      
      // First, try to find matching newsletter subscribers
      const { data: matchedSubscribers } = await supabaseClient
        .from('newsletter_subscribers')
        .select('email, id, user_id')
        .in('email', specificEmails);
      
      // Create a map for quick lookup
      const subscriberMap = new Map<string, { id: string; user_id: string | null }>();
      (matchedSubscribers || []).forEach(sub => {
        subscriberMap.set(sub.email.toLowerCase(), { id: sub.id, user_id: sub.user_id });
      });
      
      // For emails not in subscriber list, try to find matching profiles
      const unmatchedEmails = specificEmails.filter((e: string) => !subscriberMap.has(e));
      if (unmatchedEmails.length > 0) {
        const { data: matchedProfiles } = await supabaseClient
          .from('profiles')
          .select('email, id')
          .in('email', unmatchedEmails);
        
        (matchedProfiles || []).forEach(profile => {
          subscriberMap.set(profile.email.toLowerCase(), { id: profile.id, user_id: profile.id });
        });
      }
      
      subscribers = specificEmails.map((email: string) => {
        const match = subscriberMap.get(email);
        return {
          email,
          id: match?.id || null,
          user_id: match?.user_id || null
        };
      });
      
      console.log(`Matched ${subscriberMap.size}/${specificEmails.length} emails to subscriber/profile IDs`);
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
    
    // Add campaign content (apply email-safe formatting for Gmail: typography, buttons, layouts)
    htmlContent += applyEmailStyles(campaign.html_content);
    
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

    // First pass: collect all links and create short codes
    const tempHtml = htmlContent;
    while ((match = linkRegex.exec(tempHtml)) !== null) {
      const originalUrl = match[1];
      const shortCode = crypto.randomUUID().split("-")[0];
      
      // Store link in database
      await supabaseClient.from("newsletter_links").insert({
        campaign_id: campaignId,
        original_url: originalUrl,
        short_code: shortCode,
      });

      links.push({ original: originalUrl, shortCode });
    }
    
    // Second pass: replace links with tracking URLs (subscriber_id placeholder will be replaced per-subscriber)
    for (const link of links) {
      // Use {{subscriber_id}} placeholder - will be personalized per subscriber later
      const trackingUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-newsletter-click?code=${link.shortCode}&sid={{subscriber_id}}`;
      htmlContent = htmlContent.replaceAll(
        `href="${link.original}"`,
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

    // Normalize base typography so delivered emails match preview sizing more closely.
    htmlContent = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;">${htmlContent}</div>`;

    // QUEUE-BASED SENDING: For reliable delivery to large lists (2000+)
    // Instead of sending directly (which times out), we queue all emails
    // and a cron job processes them at a safe rate.
    
    const queueItems = subscribers.map((subscriber: { email: string; id: string | null; user_id: string | null }) => {
      const subscriberId = subscriber.id || 'unknown';
      const personalizedHtml = htmlContent.replace(/{{subscriber_id}}/g, subscriberId);
      
      return {
        campaign_id: campaignId,
        recipient_email: subscriber.email,
        recipient_user_id: subscriber.user_id,
        subscriber_id: subscriber.id,
        personalized_html: personalizedHtml,
        subject: finalSubject,
        from_email: fromEmail,
        from_name: fromName,
        status: 'pending',
      };
    });

    // Insert all emails into queue (batch insert)
    const BATCH_SIZE = 500;
    let queuedCount = 0;
    
    for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
      const batch = queueItems.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabaseClient
        .from("newsletter_email_queue")
        .insert(batch);
      
      if (insertError) {
        console.error(`[send-newsletter] Error queuing batch ${i / BATCH_SIZE + 1}:`, insertError);
        // Continue with other batches
      } else {
        queuedCount += batch.length;
      }
    }

    console.log(`[send-newsletter] Queued ${queuedCount}/${subscribers.length} emails for campaign ${campaignId}`);

    // Update campaign with queue count (status remains "sending" until queue is processed)
    await supabaseClient
      .from("newsletter_campaigns")
      .update({
        queued_count: queuedCount,
        processed_count: 0,
        failed_count: 0,
      })
      .eq("id", campaignId);

    // Immediately trigger the queue processor (don't wait for cron job)
    // This eliminates the ~60 second wait time between queuing and first send
    console.log(`[send-newsletter] Triggering immediate queue processing...`);
    try {
      const processorResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-newsletter-queue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({}),
        }
      );
      
      if (processorResponse.ok) {
        const processorResult = await processorResponse.json();
        console.log(`[send-newsletter] Immediate processing complete:`, processorResult);
      } else {
        console.log(`[send-newsletter] Immediate processing returned ${processorResponse.status}, cron will pick up remaining`);
      }
    } catch (invokeError) {
      console.log(`[send-newsletter] Could not invoke processor immediately, cron will handle:`, invokeError);
    }

    // Estimate completion time (80 emails/minute via cron for remaining)
    const estimatedMinutes = Math.ceil(queuedCount / 80);
    const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    return new Response(
      JSON.stringify({ 
        success: true, 
        queued: true,
        queuedCount,
        totalSubscribers: subscribers.length,
        estimatedMinutes,
        estimatedCompletion: estimatedCompletion.toISOString(),
        message: `${queuedCount} emails queued and processing started immediately.`
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