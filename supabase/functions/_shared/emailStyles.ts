/**
 * Shared email styling utilities for newsletter edge functions.
 * These functions ensure Gmail and other email clients render HTML consistently.
 * 
 * CRITICAL: Uses depth-based parsing for table/row/cell extraction because
 * newsletter tables often contain nested CTA button tables. Regex patterns
 * like `/<table>[\s\S]*?<\/table>/` terminate at the first nested `</table>`
 * (the CTA), not the outer layout table. This module provides nested-safe
 * extraction helpers to prevent that failure mode.
 */

export function mergeInlineStyle(tag: string, styleToAdd: string): string {
  // IMPORTANT: Many TipTap nodes include attributes like `data-style="..."`.
  // We must only target the real `style="..."` attribute, not `data-style`.
  // Using `(^|\s)style=` avoids matching the `style=` portion of `data-style=`.
  const styleAttrRegex = /(^|\s)style\s*=\s*"([^"]*)"/i;
  if (styleAttrRegex.test(tag)) {
    return tag.replace(styleAttrRegex, (_m, prefix, existing) => {
      const trimmed = String(existing ?? "").trim();
      const needsSemicolon = trimmed.length > 0 && !trimmed.endsWith(";");
      const sep = trimmed.length === 0 ? "" : needsSemicolon ? "; " : " ";
      return `${prefix}style="${trimmed}${sep}${styleToAdd}"`;
    });
  }

  return tag.replace(/\/?>(?=\s*$)/, (end) => ` style="${styleToAdd}"${end}`);
}

function wrapInCentered600Container(innerHtml: string): string {
  const trimmed = (innerHtml || "").trim();
  if (!trimmed) return innerHtml;
  // Avoid double-wrapping
  if (/data-email-container/i.test(trimmed.slice(0, 400))) return innerHtml;

  // Table-based centering is the most reliable across Gmail clients.
  return (
    `<table role="presentation" data-email-container cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">` +
    `<tr>` +
    `<td align="center" style="padding:0;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;border-collapse:collapse;margin:0 auto;">` +
    `<tr>` +
    `<td style="padding:0;vertical-align:top;">${innerHtml}</td>` +
    `</tr>` +
    `</table>` +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}

// ============================================================================
// DEPTH-BASED HTML PARSING HELPERS
// These helpers safely navigate nested tables (e.g., CTA buttons inside columns)
// ============================================================================

/**
 * Find the end of an opening tag (the `>` character), respecting quoted attributes.
 * Returns the index of the `>` or -1 if not found.
 */
function findTagEnd(html: string, startIndex: number): number {
  let i = startIndex;
  const len = html.length;
  while (i < len) {
    const ch = html[i];
    if (ch === ">") return i;
    if (ch === '"' || ch === "'") {
      // Skip quoted attribute value
      const quote = ch;
      i++;
      while (i < len && html[i] !== quote) i++;
    }
    i++;
  }
  return -1;
}

/**
 * Find the matching closing tag for a given opening tag, using depth tracking.
 * `tagName` should be lowercase (e.g., "table", "tr", "td").
 * `startIndex` should be the index right after the opening tag's `>`.
 * Returns the index of the first character of the closing tag, or -1 if not found.
 */
function findMatchingClose(html: string, tagName: string, startIndex: number): number {
  const openPattern = new RegExp(`<${tagName}\\b`, "i");
  const closePattern = new RegExp(`</${tagName}\\s*>`, "i");
  let depth = 1;
  let i = startIndex;
  const len = html.length;

  while (i < len && depth > 0) {
    if (html[i] === "<") {
      const remaining = html.slice(i);
      // Check for opening tag
      const openMatch = remaining.match(openPattern);
      if (openMatch && remaining.indexOf(openMatch[0]) === 0) {
        depth++;
        const tagEnd = findTagEnd(html, i);
        if (tagEnd === -1) break;
        i = tagEnd + 1;
        continue;
      }
      // Check for closing tag
      const closeMatch = remaining.match(closePattern);
      if (closeMatch && remaining.indexOf(closeMatch[0]) === 0) {
        depth--;
        if (depth === 0) return i;
        i += closeMatch[0].length;
        continue;
      }
    }
    i++;
  }
  return -1;
}

/**
 * Find all occurrences of `<table ...>...</table>` blocks that match a given
 * attribute pattern (e.g., `data-columns`), using depth-based parsing.
 * Returns an array of { start, end, fullMatch, openingTag, innerContent }.
 */
function findTablesWithAttribute(html: string, attrPattern: RegExp): Array<{
  start: number;
  end: number;
  fullMatch: string;
  openingTag: string;
  innerContent: string;
}> {
  const results: Array<{
    start: number;
    end: number;
    fullMatch: string;
    openingTag: string;
    innerContent: string;
  }> = [];
  
  let searchStart = 0;
  const len = html.length;
  
  while (searchStart < len) {
    // Find next <table that matches our attribute pattern
    const remaining = html.slice(searchStart);
    const tableOpenMatch = remaining.match(/<table\b[^>]*>/i);
    if (!tableOpenMatch) break;
    
    const tableStart = searchStart + tableOpenMatch.index!;
    const openingTag = tableOpenMatch[0];
    
    // Check if this table has the attribute we're looking for
    if (!attrPattern.test(openingTag)) {
      searchStart = tableStart + openingTag.length;
      continue;
    }
    
    // Find the end of the opening tag
    const tagEnd = findTagEnd(html, tableStart);
    if (tagEnd === -1) {
      searchStart = tableStart + 1;
      continue;
    }
    
    // Find the matching </table> using depth tracking
    const closeStart = findMatchingClose(html, "table", tagEnd + 1);
    if (closeStart === -1) {
      searchStart = tableStart + 1;
      continue;
    }
    
    // Find the end of the closing tag
    const closeEnd = html.indexOf(">", closeStart);
    if (closeEnd === -1) {
      searchStart = tableStart + 1;
      continue;
    }
    
    const innerContent = html.slice(tagEnd + 1, closeStart);
    const fullMatch = html.slice(tableStart, closeEnd + 1);
    
    results.push({
      start: tableStart,
      end: closeEnd + 1,
      fullMatch,
      openingTag,
      innerContent,
    });
    
    searchStart = closeEnd + 1;
  }
  
  return results;
}

/**
 * Extract the first top-level <tr>...</tr> from table inner HTML.
 * Ignores <tr> tags inside nested tables.
 */
function extractFirstTopLevelTr(tableInnerHtml: string): { trHtml: string; trInner: string } | null {
  let tableDepth = 0;
  let i = 0;
  const len = tableInnerHtml.length;
  
  while (i < len) {
    if (tableInnerHtml[i] === "<") {
      const remaining = tableInnerHtml.slice(i);
      
      // Track nested tables
      const tableOpenMatch = remaining.match(/^<table\b[^>]*>/i);
      if (tableOpenMatch) {
        tableDepth++;
        i += tableOpenMatch[0].length;
        continue;
      }
      
      const tableCloseMatch = remaining.match(/^<\/table\s*>/i);
      if (tableCloseMatch) {
        tableDepth = Math.max(0, tableDepth - 1);
        i += tableCloseMatch[0].length;
        continue;
      }
      
      // Look for <tr> only at depth 0 (not inside nested tables)
      if (tableDepth === 0) {
        const trOpenMatch = remaining.match(/^<tr\b[^>]*>/i);
        if (trOpenMatch) {
          const trStart = i;
          const trOpenEnd = findTagEnd(tableInnerHtml, i);
          if (trOpenEnd === -1) {
            i++;
            continue;
          }
          
          // Find matching </tr> at depth 0, tracking nested <tr> inside nested tables
          const trCloseStart = findMatchingCloseForTr(tableInnerHtml, trOpenEnd + 1);
          if (trCloseStart === -1) {
            i++;
            continue;
          }
          
          const trCloseEnd = tableInnerHtml.indexOf(">", trCloseStart);
          if (trCloseEnd === -1) {
            i++;
            continue;
          }
          
          const trHtml = tableInnerHtml.slice(trStart, trCloseEnd + 1);
          const trInner = tableInnerHtml.slice(trOpenEnd + 1, trCloseStart);
          
          return { trHtml, trInner };
        }
      }
    }
    i++;
  }
  
  return null;
}

/**
 * Find matching </tr> while tracking table depth.
 * <tr> inside nested tables don't affect our depth count for tr.
 */
function findMatchingCloseForTr(html: string, startIndex: number): number {
  let tableDepth = 0;
  let trDepth = 1;
  let i = startIndex;
  const len = html.length;
  
  while (i < len && trDepth > 0) {
    if (html[i] === "<") {
      const remaining = html.slice(i);
      
      // Track nested tables
      const tableOpenMatch = remaining.match(/^<table\b[^>]*>/i);
      if (tableOpenMatch) {
        tableDepth++;
        i += tableOpenMatch[0].length;
        continue;
      }
      
      const tableCloseMatch = remaining.match(/^<\/table\s*>/i);
      if (tableCloseMatch) {
        tableDepth = Math.max(0, tableDepth - 1);
        i += tableCloseMatch[0].length;
        continue;
      }
      
      // Only count <tr>/</ tr> at table depth 0
      if (tableDepth === 0) {
        const trOpenMatch = remaining.match(/^<tr\b[^>]*>/i);
        if (trOpenMatch) {
          trDepth++;
          i += trOpenMatch[0].length;
          continue;
        }
        
        const trCloseMatch = remaining.match(/^<\/tr\s*>/i);
        if (trCloseMatch) {
          trDepth--;
          if (trDepth === 0) return i;
          i += trCloseMatch[0].length;
          continue;
        }
      }
    }
    i++;
  }
  
  return -1;
}

/**
 * Extract top-level <td>...</td> segments from row inner HTML.
 * Uses depth-tracking to safely handle nested tables (like CTA buttons).
 * This prevents the regex from "closing" at nested </td> tags.
 */
function extractTopLevelTdHtml(rowInnerHtml: string): string[] {
  const segments: string[] = [];
  let tableDepth = 0;
  let tdDepth = 0;
  let start = -1;
  let i = 0;
  const len = rowInnerHtml.length;

  while (i < len) {
    if (rowInnerHtml[i] === "<") {
      const remaining = rowInnerHtml.slice(i);
      
      // Track nested tables
      const tableOpenMatch = remaining.match(/^<table\b[^>]*>/i);
      if (tableOpenMatch) {
        tableDepth++;
        i += tableOpenMatch[0].length;
        continue;
      }
      
      const tableCloseMatch = remaining.match(/^<\/table\s*>/i);
      if (tableCloseMatch) {
        tableDepth = Math.max(0, tableDepth - 1);
        i += tableCloseMatch[0].length;
        continue;
      }
      
      // Only count <td>/</ td> at table depth 0
      if (tableDepth === 0) {
        const openMatch = remaining.match(/^<td\b[^>]*>/i);
        const closeMatch = remaining.match(/^<\/td\s*>/i);

        if (openMatch) {
          if (tdDepth === 0) {
            start = i;
          }
          tdDepth++;
          i += openMatch[0].length;
          continue;
        } else if (closeMatch) {
          tdDepth = Math.max(0, tdDepth - 1);
          if (tdDepth === 0 && start >= 0) {
            segments.push(rowInnerHtml.slice(start, i + closeMatch[0].length));
            start = -1;
          }
          i += closeMatch[0].length;
          continue;
        }
      }
    }
    i++;
  }

  return segments;
}

/**
 * Extract the inner HTML content from a <td>...</td> segment.
 */
function getTdInnerHtml(tdHtml: string): string {
  return tdHtml
    .replace(/^<td\b[^>]*>/i, "")
    .replace(/<\/td>\s*$/i, "");
}

/**
 * Override image width attributes inside column cells.
 * Removes width="600px" or similar large widths and sets proper column width.
 */
function normalizeColumnImages(content: string, colPixelWidth: number): string {
  return content.replace(/<img\b[^>]*>/gi, (imgTag) => {
    // Remove existing width attribute that might cause overflow
    let normalized = imgTag.replace(/\s+width\s*=\s*["'][^"']*["']/gi, "");
    // Add correct width attribute and styles
    normalized = normalized.replace(
      /^<img/i,
      `<img width="${colPixelWidth}"`
    );
    return mergeInlineStyle(normalized, `width:100%;max-width:${colPixelWidth}px;height:auto;display:block;`);
  });
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

/**
 * Constrain TipTap-generated tables (`class="newsletter-table"`) to the 600px
 * desktop email standard and prevent oversized images (e.g. width="600px") from
 * forcing column overflow.
 *
 * IMPORTANT:
 * - This runs BEFORE `styleStandardTablesOnly()` and we exclude newsletter-table
 *   from that regex-based styler to avoid it appending `table-layout:auto` and
 *   breaking fixed-layout column tables.
 * - This targets ONLY campaign/template body HTML (header/footer is injected
 *   outside `applyEmailStyles()`), so it's safe to normalize aggressively here.
 */
export function styleNewsletterTables(html: string): string {
  let result = html;

  const newsletterTables = findTablesWithAttribute(result, /\bnewsletter-table\b/i)
    .filter((t) => !/data-two-column/i.test(t.openingTag))
    .filter((t) => !/data-columns/i.test(t.openingTag))
    .filter((t) => !/data-cta-button/i.test(t.openingTag))
    .filter((t) => !t.fullMatch.includes("<!--[if mso]>")); // don't double-process

  const addOrReplaceWidthAttr = (tableOpenTag: string, width: string) => {
    const withoutWidth = tableOpenTag.replace(/\s+width\s*=\s*["'][^"']*["']/i, "");
    return withoutWidth.replace(/^<table\b/i, `<table width="${width}"`);
  };

  const normalizeImageForCell = (imgTag: string) => {
    // Remove hard width/height attributes (Gmail can prioritize them over CSS)
    let normalized = imgTag
      .replace(/\s+width\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s+height\s*=\s*["'][^"']*["']/gi, "");

    // Force responsive scaling within whatever cell width exists
    normalized = mergeInlineStyle(
      normalized,
      "width:100%;max-width:100%;height:auto;display:block;"
    );
    return normalized;
  };

  // Process in reverse order to preserve indices
  for (let i = newsletterTables.length - 1; i >= 0; i--) {
    const table = newsletterTables[i];

    const hasFixedLayout =
      /table-layout\s*:\s*fixed/i.test(table.openingTag) ||
      /table-layout\s*:\s*fixed/i.test(table.innerContent);

    // Update opening tag: enforce the 600px container width
    let newOpeningTag = addOrReplaceWidthAttr(table.openingTag, "600");
    newOpeningTag = mergeInlineStyle(
      newOpeningTag,
      `width:600px;max-width:600px;margin:0 auto;border-collapse:collapse;${hasFixedLayout ? "table-layout:fixed;" : ""}`
    );

    // Update inner content: ensure cells are readable and images can't overflow
    let newInner = table.innerContent;
    newInner = newInner.replace(/<th\b[^>]*>/gi, (thTag) =>
      mergeInlineStyle(
        thTag,
        "padding:6px 10px;vertical-align:top;text-align:left;font-weight:700;"
      )
    );
    newInner = newInner.replace(/<td\b[^>]*>/gi, (tdTag) =>
      mergeInlineStyle(
        tdTag,
        "padding:6px 10px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;"
      )
    );
    newInner = newInner.replace(/<img\b[^>]*>/gi, normalizeImageForCell);

    const replacement = `${newOpeningTag}${newInner}</table>`;
    result = result.slice(0, table.start) + replacement + result.slice(table.end);
  }

  return result;
}

export function styleStandardTablesOnly(html: string): string {
  return (html || "").replace(
    /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)(?![^>]*data-cta-button)(?![^>]*\bnewsletter-table\b)[\s\S]*?<\/table>/gi,
    (tableHtml) => {
      let updated = tableHtml.replace(
        /<table\b(?![^>]*data-two-column)(?![^>]*data-columns)(?![^>]*data-cta-button)(?![^>]*\bnewsletter-table\b)[^>]*>/i,
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
 * Uses depth-based parsing to correctly handle nested CTA button tables.
 * 
 * CRITICAL: This function uses findTablesWithAttribute() and extractFirstTopLevelTr()
 * instead of regex to ensure nested </table> and </tr> tags (from CTA buttons)
 * don't terminate the match prematurely.
 */
export function styleColumnLayoutTables(html: string): string {
  let result = html;
  
  // First pass: Handle tables with data-mobile-stack="true"
  const stackableTables = findTablesWithAttribute(result, /data-mobile-stack\s*=\s*["']true["']/i)
    .filter(t => /data-columns/i.test(t.openingTag));
  
  // Process in reverse order to preserve indices
  for (let i = stackableTables.length - 1; i >= 0; i--) {
    const table = stackableTables[i];
    
    // Extract first top-level row (ignoring rows inside nested CTA tables)
    const trData = extractFirstTopLevelTr(table.innerContent);
    if (!trData) continue;
    
    // Extract top-level TD segments from that row
    const tdSegments = extractTopLevelTdHtml(trData.trInner);
    if (tdSegments.length === 0) continue;
    
    const numColumns = tdSegments.length;
    const colMaxWidth = Math.floor(600 / numColumns);
    
    // Build fluid-hybrid structure: each column is an inline-block div
    // NOTE: On desktop, columns appear side-by-side. The border-bottom is intended
    // to only show when stacked on mobile. Since we can't use media queries in email,
    // we'll NOT add borders here - they should only appear when truly stacked.
    // The stacking happens naturally via inline-block at narrow widths.
    const columnDivs = tdSegments.map((tdHtml, colIndex) => {
      const rawContent = getTdInnerHtml(tdHtml);
      // Normalize image widths to prevent overflow
      const styledContent = normalizeColumnImages(rawContent, colMaxWidth);
      // No horizontal divider lines - these only make sense when stacked, 
      // but we can't conditionally apply them without media queries.
      // Desktop view should have no dividers between side-by-side columns.
      // Use fixed width (not width:100%) to prevent desktop wrapping - columns stay side-by-side
      // until viewport shrinks below 600px where inline-block naturally stacks.
      return `<!--[if mso]><td valign="top" width="${colMaxWidth}"><![endif]--><div style="display:inline-block;width:${colMaxWidth}px;max-width:100%;vertical-align:top;font-size:16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><td style="padding:0 8px;vertical-align:top;">${styledContent}</td></tr></table></div><!--[if mso]></td><![endif]-->`;
    }).join("");
    
    const replacement = `<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;margin:0 auto;border-collapse:collapse;"><tr><td align="center" style="font-size:0;letter-spacing:0;word-spacing:0;"><!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><![endif]-->${columnDivs}<!--[if mso]></tr></table><![endif]--></td></tr></table>`;
    
    result = result.slice(0, table.start) + replacement + result.slice(table.end);
  }
  
  // Second pass: Handle remaining data-columns tables (without mobile-stack)
  const fixedTables = findTablesWithAttribute(result, /data-columns/i)
    .filter(t => !/data-mobile-stack\s*=\s*["']true["']/i.test(t.openingTag))
    .filter(t => !t.fullMatch.includes('<!--[if mso]>')); // Skip already processed
  
  for (let i = fixedTables.length - 1; i >= 0; i--) {
    const table = fixedTables[i];
    
    const trData = extractFirstTopLevelTr(table.innerContent);
    if (!trData) continue;
    
    const tdSegments = extractTopLevelTdHtml(trData.trInner);
    if (tdSegments.length === 0) continue;
    
    const numColumns = tdSegments.length;
    const colWidthPercent = (100 / numColumns).toFixed(2);
    const colPixelWidth = Math.floor(600 / numColumns);
    
    // Build table cells with explicit widths for Gmail
    const tableCells = tdSegments.map((tdHtml) => {
      const rawContent = getTdInnerHtml(tdHtml);
      const styledContent = normalizeColumnImages(rawContent, colPixelWidth);
      return `<td width="${colPixelWidth}" style="width:${colWidthPercent}%;max-width:${colPixelWidth}px;padding:0 8px;vertical-align:top;">${styledContent}</td>`;
    }).join("");
    
    const replacement = `<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;margin:0 auto;table-layout:fixed;border-collapse:collapse;"><tr>${tableCells}</tr></table>`;
    
    result = result.slice(0, table.start) + replacement + result.slice(table.end);
  }
  
  return result;
}

/**
 * Style magazine (multi-column) layout tables for email rendering.
 * Uses depth-based parsing to correctly handle nested CTA button tables.
 * 
 * CRITICAL: Magazine layouts ALWAYS use fluid-hybrid responsive design so they
 * stack on mobile (narrow viewports). This uses inline-block divs that naturally
 * wrap when the viewport is narrower than the combined column widths.
 * 
 * This function uses findTablesWithAttribute() and extractFirstTopLevelTr()
 * instead of regex to ensure nested </table> and </tr> tags (from CTA buttons)
 * don't terminate the match prematurely.
 */
export function styleMagazineLayouts(html: string): string {
  let result = html;
  
  const magazineTables = findTablesWithAttribute(result, /data-two-column/i)
    .filter(t => !t.fullMatch.includes('<!--[if mso]>')); // Skip already processed
  
  // Process in reverse order to preserve indices
  for (let i = magazineTables.length - 1; i >= 0; i--) {
    const table = magazineTables[i];
    
    // Extract table-level styles from opening tag
    const tableStyleMatch = table.openingTag.match(/style\s*=\s*"([^"]*)"/i);
    const tableStyle = tableStyleMatch?.[1] || '';
    
    const bgMatch = tableStyle.match(/background(?:-color)?:\s*([^;]+)/i);
    const paddingMatch = tableStyle.match(/padding:\s*([^;]+)/i);
    const borderRadiusMatch = tableStyle.match(/border-radius:\s*([^;]+)/i);
    
    const wrapperBgStyle = bgMatch ? `background:${bgMatch[1].trim()};` : "";
    const wrapperPadding = paddingMatch ? paddingMatch[1].trim() : "0";
    const wrapperBorderRadius = borderRadiusMatch ? `border-radius:${borderRadiusMatch[1].trim()};` : "";
    
    // Extract first top-level row (ignoring rows inside nested CTA tables)
    const trData = extractFirstTopLevelTr(table.innerContent);
    if (!trData) continue;
    
    // Extract top-level TD segments from that row
    const tdSegments = extractTopLevelTdHtml(trData.trInner);
    if (tdSegments.length === 0) continue;
    
    const numColumns = tdSegments.length;
    const colMaxWidth = Math.floor(600 / numColumns);
    
    // Build fluid-hybrid structure: each column is an inline-block div
    // This allows natural stacking on narrow viewports (mobile)
    // Use fixed width (not width:100%) to prevent desktop wrapping - columns stay side-by-side
    // until viewport shrinks below 600px where inline-block naturally stacks.
    const columnDivs = tdSegments.map((tdHtml, colIndex) => {
      const rawContent = getTdInnerHtml(tdHtml);
      const styledContent = normalizeColumnImages(rawContent, colMaxWidth);
      return `<!--[if mso]><td valign="top" width="${colMaxWidth}"><![endif]--><div style="display:inline-block;width:${colMaxWidth}px;max-width:100%;vertical-align:top;font-size:16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><td style="padding:0 8px;vertical-align:top;">${styledContent}</td></tr></table></div><!--[if mso]></td><![endif]-->`;
    }).join("");
    
    // Outer wrapper preserves background/padding/border-radius, inner uses fluid-hybrid
    const replacement = `<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;margin:16px auto;border-collapse:collapse;${wrapperBgStyle}${wrapperBorderRadius}"><tr><td style="padding:${wrapperPadding};"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;"><tr><td align="center" style="font-size:0;letter-spacing:0;word-spacing:0;"><!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0"><tr><![endif]-->${columnDivs}<!--[if mso]></tr></table><![endif]--></td></tr></table></td></tr></table>`;
    
    result = result.slice(0, table.start) + replacement + result.slice(table.end);
  }
  
  return result;
}

export function styleFooterImages(html: string): string {
  return (html || "").replace(/<img\b[^>]*>/gi, (imgTag) =>
    mergeInlineStyle(imgTag, "max-width:200px;height:auto;margin:0 auto;display:block;")
  );
}

/**
 * Constrain styled boxes (divs with background/gradient styles) to 600px.
 * These are typically created by TipTap's styled-box extension.
 */
export function styleStyledBoxes(html: string): string {
  let result = html;
  
  // Match divs with background styling (styled boxes, gradient boxes, etc.)
  // These include "This Month at a Glance" style gradient boxes
  result = result.replace(
    /<div\b([^>]*(?:background|linear-gradient)[^>]*)>/gi,
    (divTag, attrs) => {
      // Wrap in 600px constraint if not already
      if (/max-width\s*:\s*600px/i.test(divTag)) {
        return divTag;
      }
      return mergeInlineStyle(divTag, "max-width:600px;margin-left:auto;margin-right:auto;");
    }
  );
  
  return result;
}

/**
 * Constrain standalone content blocks (paragraphs, headings, lists, blockquotes)
 * to 600px width for email consistency.
 * Only applies to top-level elements that aren't already inside constrained containers.
 */
export function constrainContentBlocks(html: string): string {
  let result = html;
  
  // Wrap unordered lists in 600px container
  result = result.replace(
    /<ul\b([^>]*)>/gi,
    (ulTag, attrs) => {
      if (/max-width\s*:\s*600px/i.test(ulTag)) {
        return ulTag;
      }
      return mergeInlineStyle(ulTag, "max-width:600px;margin-left:auto;margin-right:auto;");
    }
  );
  
  // Wrap ordered lists in 600px container
  result = result.replace(
    /<ol\b([^>]*)>/gi,
    (olTag, attrs) => {
      if (/max-width\s*:\s*600px/i.test(olTag)) {
        return olTag;
      }
      return mergeInlineStyle(olTag, "max-width:600px;margin-left:auto;margin-right:auto;");
    }
  );
  
  // Wrap blockquotes in 600px container
  result = result.replace(
    /<blockquote\b([^>]*)>/gi,
    (bqTag, attrs) => {
      if (/max-width\s*:\s*600px/i.test(bqTag)) {
        return bqTag;
      }
      return mergeInlineStyle(bqTag, "max-width:600px;margin-left:auto;margin-right:auto;");
    }
  );
  
  // Wrap horizontal rules (dividers) in 600px
  result = result.replace(
    /<hr\b([^>]*)>/gi,
    (hrTag, attrs) => {
      if (/max-width\s*:\s*600px/i.test(hrTag)) {
        return hrTag;
      }
      return mergeInlineStyle(hrTag, "max-width:600px;margin-left:auto;margin-right:auto;");
    }
  );
  
  // Constrain standalone images not already in tables
  result = result.replace(
    /(<p\b[^>]*>)\s*(<img\b[^>]*>)\s*(<\/p>)/gi,
    (match, pOpen, imgTag, pClose) => {
      // Add max-width to the paragraph containing the image
      let constrainedP = pOpen;
      if (!/max-width\s*:\s*600px/i.test(pOpen)) {
        constrainedP = mergeInlineStyle(pOpen, "max-width:600px;margin-left:auto;margin-right:auto;");
      }
      // Also ensure image is responsive
      let constrainedImg = imgTag;
      if (!/max-width\s*:/i.test(imgTag)) {
        constrainedImg = mergeInlineStyle(imgTag, "max-width:100%;height:auto;");
      }
      return `${constrainedP}${constrainedImg}${pClose}`;
    }
  );
  
  return result;
}

/**
 * Apply all email styling transformations in the correct order.
 * This is the main function to call for processing newsletter HTML.
 */
export function applyEmailStyles(html: string): string {
  let result = html;

  // 0. Constrain TipTap tables to the 600px email standard
  result = styleNewsletterTables(result);
  
  // 1. Standard tables first (avoid touching special layout tables)
  result = styleStandardTablesOnly(result);
  
  // 2. Column layouts (data-columns)
  result = styleColumnLayoutTables(result);
  
  // 3. Magazine layouts (data-two-column)
  result = styleMagazineLayouts(result);
  
  // 4. Styled boxes (gradient backgrounds, etc.)
  result = styleStyledBoxes(result);
  
  // 5. Constrain content blocks (lists, blockquotes, dividers, images)
  result = constrainContentBlocks(result);
  
  // 6. CTA buttons (ensure explicit styles for Gmail)
  result = styleCTAButtons(result);
  
  // 7. Typography normalization (explicit font sizes for Gmail)
  result = normalizeTypography(result);

  // 8. Final: Wrap everything in a centered 600px container so non-table content
  // (headings, paragraphs, styled boxes) never renders full-width.
  result = wrapInCentered600Container(result);
  
  return result;
}
