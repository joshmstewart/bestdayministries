import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone } from "lucide-react";

interface NewsletterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  previewText: string;
  htmlContent: string;
}

type ViewportMode = "desktop" | "mobile";

export const NewsletterPreviewDialog = ({
  open,
  onOpenChange,
  subject,
  previewText,
  htmlContent,
}: NewsletterPreviewDialogProps) => {
  const [headerHtml, setHeaderHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Best Day Ministries");
  const [orgAddress, setOrgAddress] = useState("Your Address Here");
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");

  useEffect(() => {
    if (open) {
      loadHeaderFooter();
    }
  }, [open]);

  const loadHeaderFooter = async () => {
    try {
      const [headerRes, footerRes, orgRes] = await Promise.all([
        supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "newsletter_header")
          .single(),
        supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "newsletter_footer")
          .single(),
        supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "newsletter_organization")
          .single(),
      ]);

      const headerData = headerRes.data;
      const footerData = footerRes.data;
      const orgData = orgRes.data;

      if (headerData?.setting_value) {
        const headerValue = headerData.setting_value as any;
        setHeaderEnabled(headerValue.enabled || false);
        setHeaderHtml(headerValue.html || "");
      }

      if (footerData?.setting_value) {
        const footerValue = footerData.setting_value as any;
        setFooterEnabled(footerValue.enabled || false);
        setFooterHtml(footerValue.html || "");
      }

      if (orgData?.setting_value) {
        const orgValue = orgData.setting_value as any;
        setOrgName(orgValue.name || "Best Day Ministries");
        setOrgAddress(orgValue.address || "Your Address Here");
      }
    } catch (error) {
      console.error("Failed to load header/footer/org settings:", error);
    }
  };

  const processedVars = useMemo(() => {
    const siteUrl = window.location.origin;
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
    return {
      siteUrl,
      month: monthNames[now.getMonth()],
      year: now.getFullYear().toString(),
    };
  }, []);

  // Style empty paragraphs to be 12px spacers
  const styleEmptyParagraphs = (html: string): string => {
    // Match <p> tags that contain only whitespace, &nbsp;, or are truly empty
    return (html || "").replace(
      /<p\b([^>]*)>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi,
      (match, attrs) => {
        // Merge inline style for 12px height
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
  };

  // Replace placeholders in content
  const processedContent = useMemo(() => {
    let content = htmlContent || "";
    content = content.replace(/{{site_url}}/g, processedVars.siteUrl);
    content = content.replace(/{{organization_name}}/g, orgName);
    content = content.replace(/{{month}}/g, processedVars.month);
    content = content.replace(/{{year}}/g, processedVars.year);
    
    // Apply empty paragraph styling
    content = styleEmptyParagraphs(content);

    return content;
  }, [htmlContent, orgName, processedVars.month, processedVars.siteUrl, processedVars.year]);

  // Replace placeholders in subject
  const processedSubject = useMemo(() => {
    return (subject || "")
      .replace(/{{organization_name}}/g, orgName)
      .replace(/{{month}}/g, processedVars.month)
      .replace(/{{year}}/g, processedVars.year);
  }, [subject, orgName, processedVars.month, processedVars.year]);

  // Construct final email HTML with header and footer (memoized to prevent hot reload issues)
  const finalHtml = useMemo(
    () => `
      ${headerEnabled ? headerHtml : ""}
      ${processedContent || '<p class="text-muted-foreground text-center py-8">No content to preview</p>'}
      ${footerEnabled ? `<div data-newsletter-footer>${footerHtml}</div>` : ""}
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>You're receiving this because you subscribed to our newsletter.</p>
        <p><a href="#" style="color: #666;">Unsubscribe</a></p>
        <p>${orgName}<br/>${orgAddress.replace(/\n/g, '<br/>')}</p>
      </div>
    `,
    [
      headerEnabled,
      headerHtml,
      processedContent,
      footerEnabled,
      footerHtml,
      orgName,
      orgAddress,
    ]
  );

  // Desktop styles - standard rendering
  const desktopStyles = `
    .email-preview h1 { font-size: 2.5em; font-weight: bold; margin: 0.67em 0; line-height: 1.2; }
    .email-preview h2 { font-size: 2em; font-weight: bold; margin: 0.75em 0; line-height: 1.3; }
    .email-preview h3 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; line-height: 1.4; }
    .email-preview h4 { font-size: 1.25em; font-weight: bold; margin: 1em 0; line-height: 1.4; }
    .email-preview h5 { font-size: 1em; font-weight: bold; margin: 1.33em 0; line-height: 1.5; }
    .email-preview h6 { font-size: 0.875em; font-weight: bold; margin: 1.67em 0; line-height: 1.5; }
    .email-preview p { margin: 0; line-height: 1.5; }
    /* Styled boxes should have tight paragraphs so single-line boxes stay compact */
    .email-preview [data-styled-box] p { margin: 0; }
    /* Also remove heading margins inside styled boxes for compact single-line titles */
    .email-preview [data-styled-box] h1,
    .email-preview [data-styled-box] h2,
    .email-preview [data-styled-box] h3,
    .email-preview [data-styled-box] h4,
    .email-preview [data-styled-box] h5,
    .email-preview [data-styled-box] h6 { margin: 0; }
    .email-preview ul, .email-preview ol { margin: 1em 0; padding-left: 2em; line-height: 1.6; }
    .email-preview li { margin: 0.5em 0; }
    .email-preview strong { font-weight: bold; }
    .email-preview em { font-style: italic; }
    .email-preview a { color: #0066cc; text-decoration: underline; }
    /* IMPORTANT: don't set width here; it overrides inline/attribute widths in header/footer templates */
    .email-preview img { max-width: 100%; height: auto; display: block; }
    .email-preview [data-newsletter-footer] img { max-width: 200px; height: auto; margin: 0 auto; display: block; }

    /* Improve readability for normal tables in preview (keep magazine 2-col tables and CTA button tables untouched) */
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) th,
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) td {
      padding: 6px 10px;
      vertical-align: top;
    }
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) th {
      font-weight: 700;
      text-align: left;
    }
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) td {
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    /* Alternating row shading for better legibility */
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) tbody tr:nth-child(even) td,
    .email-preview table:not([data-two-column]):not([data-columns]):not([data-cta-button]) tr:nth-child(even) td {
      background-color: rgba(255, 255, 255, 0.15);
    }
    .email-preview table[data-two-column] { table-layout: fixed; width: 100%; }
    .email-preview table[data-two-column] td { width: 50%; vertical-align: top; }
    /* Column layout tables (from Insert Columns feature) */
    .email-preview table[data-columns] { table-layout: fixed !important; width: 100%; }
    .email-preview table[data-columns="2"] td { width: 50%; vertical-align: top; }
    .email-preview table[data-columns="3"] td { width: 33.33%; vertical-align: top; }
    .email-preview table[data-columns] td img { width: 100%; height: auto; object-fit: cover; }
    /* Ensure images scale within magazine columns */
    .email-preview table[data-two-column] td img { width: 100%; height: auto; object-fit: cover; }
  `;

  // Mobile styles - simulate column stacking behavior only for tables with data-mobile-stack
  const mobileStyles = `
    ${desktopStyles}
    
    /* Mobile simulation: stack columns vertically for tables with data-mobile-stack="true" */
    .email-preview table[data-mobile-stack="true"],
    .email-preview table[data-two-column] {
      table-layout: auto !important;
    }
    
    .email-preview table[data-mobile-stack="true"] tr,
    .email-preview table[data-two-column] tr {
      display: block !important;
    }
    
    /* Regular column tables: stack with dividers */
    .email-preview table[data-mobile-stack="true"] td {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      padding-bottom: 16px !important;
      margin-bottom: 16px !important;
      border-bottom: 1px solid #e5e5e5 !important;
    }
    
    /* Magazine layouts: stack WITHOUT dividers */
    .email-preview table[data-two-column] td {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      padding-bottom: 16px !important;
      margin-bottom: 0 !important;
      border-bottom: none !important;
    }
    
    /* Remove bottom padding/margin/border from last column of regular tables */
    .email-preview table[data-mobile-stack="true"] td:last-child {
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
      border-bottom: none !important;
    }
    
    /* Ensure images still fill the stacked column width */
    .email-preview table[data-mobile-stack="true"] td img,
    .email-preview table[data-two-column] td img {
      width: 100% !important;
      height: auto !important;
    }
    
    /* Tables WITHOUT mobile-stack keep their side-by-side layout */
    .email-preview table[data-columns]:not([data-mobile-stack="true"]) {
      table-layout: fixed !important;
    }
    .email-preview table[data-columns]:not([data-mobile-stack="true"]) tr {
      display: table-row !important;
    }
    .email-preview table[data-columns]:not([data-mobile-stack="true"]) td {
      display: table-cell !important;
    }
  `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Email Preview</DialogTitle>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewportMode === "desktop" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewportMode("desktop")}
                title="Desktop preview (600px)"
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewportMode === "mobile" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewportMode("mobile")}
                title="Mobile preview (375px)"
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Email header preview */}
          <div className="bg-muted/30 px-6 py-4 border-b">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Subject:</div>
              <div className="font-semibold">{processedSubject || "(No subject)"}</div>
              {previewText && (
                <>
                  <div className="text-xs text-muted-foreground mt-2">Preview text:</div>
                  <div className="text-sm text-muted-foreground">{previewText}</div>
                </>
              )}
            </div>
          </div>

          {/* Email content preview */}
          <div className="bg-white flex justify-center">
            <style>{viewportMode === "mobile" ? mobileStyles : desktopStyles}</style>
            <div 
              className="email-preview max-w-none p-6 transition-all duration-200"
              style={{ 
                fontSize: '16px',
                width: viewportMode === "mobile" ? "375px" : "600px",
                minHeight: "300px"
              }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalHtml) }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
