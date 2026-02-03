/**
 * Shared email styling utilities for newsletter edge functions.
 * These functions ensure Gmail and other email clients render HTML consistently.
 */

export function mergeInlineStyle(tag: string, styleToAdd: string): string {
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
export function styleCTAButtons(html: string): string {
  return (html || "").replace(
    /<table\b([^>]*data-cta-button[^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, _attrs, _tableContent) => {
      // Ensure the anchor has explicit styles
      let updated = fullMatch.replace(
        /<a\b([^>]*)>/gi,
        (aTag, _aAttrs) => {
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
export function normalizeTypography(html: string): string {
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

export function styleStandardTablesOnly(html: string): string {
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
export function styleColumnLayoutTables(html: string): string {
  // First, handle tables with data-mobile-stack="true" - apply fluid-hybrid layout
  let result = (html || "").replace(
    /<table\b([^>]*data-mobile-stack\s*=\s*["']true["'][^>]*data-columns\s*=\s*["'](\d+)["'][^>]*|[^>]*data-columns\s*=\s*["'](\d+)["'][^>]*data-mobile-stack\s*=\s*["']true["'][^>]*)>([\s\S]*?)<\/table>/gi,
    (fullMatch, _attrs, colCount1, colCount2, tableContent) => {
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
    (fullMatch, _attrs, columnCount, tableContent) => {
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
 * Uses fixed table-cell layout for Gmail compatibility (not inline-block).
 * Dynamically calculates column widths based on actual number of columns.
 */
export function styleMagazineLayouts(html: string): string {
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

export function styleFooterImages(html: string): string {
  return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
    mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
  );
}

/**
 * Apply all email styling transformations in the correct order.
 * This is the main function to call for processing newsletter HTML.
 */
export function applyEmailStyles(html: string): string {
  let result = html;
  
  // 1. Standard tables first (avoid touching special layout tables)
  result = styleStandardTablesOnly(result);
  
  // 2. Column layouts (data-columns)
  result = styleColumnLayoutTables(result);
  
  // 3. Magazine layouts (data-two-column)
  result = styleMagazineLayouts(result);
  
  // 4. CTA buttons (ensure explicit styles for Gmail)
  result = styleCTAButtons(result);
  
  // 5. Typography normalization (explicit font sizes for Gmail)
  result = normalizeTypography(result);
  
  return result;
}
