import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TwoColumnNodeView } from './TwoColumnNodeView';

export type TwoColumnLayout = 'text-left-image-right' | 'image-left-text-right' | 'equal-columns';

export interface TwoColumnOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    twoColumn: {
      setTwoColumn: (layout: TwoColumnLayout, imageUrl?: string) => ReturnType;
    };
  }
}

export const TwoColumn = Node.create<TwoColumnOptions>({
  name: 'twoColumn',

  group: 'block',

  atom: true, // Atomic node - handled by NodeView

  // HIGH PRIORITY: Ensure this matches <table data-two-column> BEFORE the generic Table extension
  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TwoColumnNodeView);
  },

  addAttributes() {
    return {
      layout: {
        default: 'text-left-image-right',
        parseHTML: element => {
          return element.getAttribute('data-layout') || 'text-left-image-right';
        },
        renderHTML: attributes => {
          return { 'data-layout': attributes.layout };
        },
      },
      leftContent: {
        default: 'Your Headline\n\nAdd your content here. This text will appear on the left side of the layout.',
        parseHTML: element => {
          const leftCell = element.querySelector('td[data-column="left"]');
          if (!leftCell) return '';
          
          // Extract CTA buttons first and convert to markers
          const ctaMarkers: string[] = [];
          const ctaTables = leftCell.querySelectorAll('table[data-cta-button]');
          ctaTables.forEach(table => {
            const link = table.querySelector('a');
            const td = table.querySelector('td[style*="background-color"]');
            if (link && td) {
              const text = link.textContent || 'Click Here';
              const url = link.getAttribute('href') || '#';
              const style = td.getAttribute('style') || '';
              const colorMatch = style.match(/background-color:\s*([^;]+)/);
              const color = colorMatch?.[1]?.trim() || '#f97316';
              ctaMarkers.push(`[CTA:${text}|${url}|${color}]`);
            }
            // Remove the CTA table from consideration for text extraction
            table.remove();
          });
          
          // Convert block elements to newlines before stripping tags
          let html = leftCell.innerHTML || '';
          // Replace </h2>, </p>, <br> with newlines to preserve line breaks
          html = html.replace(/<\/h2>/gi, '\n\n');
          html = html.replace(/<\/p>/gi, '\n');
          html = html.replace(/<br\s*\/?>/gi, '\n');
          // Strip remaining HTML tags
          html = html.replace(/<[^>]*>/g, '');
          // Clean up excessive newlines and trim
          html = html.replace(/\n{3,}/g, '\n\n').trim();
          
          // Append CTA markers
          if (ctaMarkers.length > 0) {
            html = html + '\n' + ctaMarkers.join('\n');
          }
          
          return html;
        },
      },
      rightContent: {
        default: 'Your Headline\n\nAdd your content here. This text will appear on the right side of the layout.',
        parseHTML: element => {
          const rightCell = element.querySelector('td[data-column="right"]');
          if (!rightCell) return '';
          
          // Extract CTA buttons first and convert to markers
          const ctaMarkers: string[] = [];
          const ctaTables = rightCell.querySelectorAll('table[data-cta-button]');
          ctaTables.forEach(table => {
            const link = table.querySelector('a');
            const td = table.querySelector('td[style*="background-color"]');
            if (link && td) {
              const text = link.textContent || 'Click Here';
              const url = link.getAttribute('href') || '#';
              const style = td.getAttribute('style') || '';
              const colorMatch = style.match(/background-color:\s*([^;]+)/);
              const color = colorMatch?.[1]?.trim() || '#f97316';
              ctaMarkers.push(`[CTA:${text}|${url}|${color}]`);
            }
            // Remove the CTA table from consideration for text extraction
            table.remove();
          });
          
          // Convert block elements to newlines before stripping tags
          let html = rightCell.innerHTML || '';
          // Replace </h2>, </p>, <br> with newlines to preserve line breaks
          html = html.replace(/<\/h2>/gi, '\n\n');
          html = html.replace(/<\/p>/gi, '\n');
          html = html.replace(/<br\s*\/?>/gi, '\n');
          // Strip remaining HTML tags
          html = html.replace(/<[^>]*>/g, '');
          // Clean up excessive newlines and trim
          html = html.replace(/\n{3,}/g, '\n\n').trim();
          
          // Append CTA markers
          if (ctaMarkers.length > 0) {
            html = html + '\n' + ctaMarkers.join('\n');
          }
          
          return html;
        },
      },
      imageUrl: {
        default: '',
        parseHTML: element => {
          const img = element.querySelector('img');
          return img?.getAttribute('src') || '';
        },
      },
      backgroundColor: {
        default: 'transparent',
        parseHTML: element => {
          const style = element.getAttribute('style') || '';
          const match = style.match(/background-color:\s*([^;]+)/);
          return match?.[1]?.trim() || 'transparent';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'table[data-two-column]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // IMPORTANT:
    // TipTap's `HTMLAttributes` here contain *rendered HTML attrs* (e.g. `data-layout`),
    // not the raw node attrs. To avoid losing user edits (and to avoid layout flips),
    // always read from `node.attrs`.
    const { layout, leftContent, rightContent, imageUrl, backgroundColor } = node.attrs as {
      layout: TwoColumnLayout;
      leftContent: string;
      rightContent: string;
      imageUrl: string;
      backgroundColor: string;
    };
    
    const isImageLeft = layout === 'image-left-text-right';
    const isEqual = layout === 'equal-columns';
    
    // Helper function to convert plain text to properly nested TipTap elements
    // First line becomes headline, rest becomes body, [CTA:text|url|color] becomes buttons
    const textToElements = (text: string): any[] => {
      const safeText = typeof text === 'string' ? text : '';
      
      // Check for CTA markers and separate them
      const ctaRegex = /\[CTA:([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      const ctas: Array<{ text: string; url: string; color: string }> = [];
      let textWithoutCtas = safeText;
      
      let match;
      while ((match = ctaRegex.exec(safeText)) !== null) {
        ctas.push({
          text: match[1],
          url: match[2],
          color: match[3],
        });
      }
      textWithoutCtas = safeText.replace(ctaRegex, '').trim();
      
      const lines = textWithoutCtas.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0 && ctas.length === 0) return [['span', {}, '']];
      
      const elements: any[] = [];
      
      if (lines.length > 0) {
        const headline = lines[0];
        const body = lines.slice(1).join(' ');
        
        elements.push(['h2', { style: 'margin: 16px 0 16px 0; font-size: 24px; font-weight: bold;' }, headline]);
        
        if (body) {
          elements.push(['p', { style: 'margin: 0; font-size: 16px; line-height: 1.6;' }, body]);
        }
      }
      
      // Add CTA buttons as email-safe table structures
      for (const cta of ctas) {
        elements.push([
          'table',
          {
            'data-cta-button': '',
            cellpadding: '0',
            cellspacing: '0',
            border: '0',
            style: 'margin: 16px 0;',
          },
          [
            'tbody',
            {},
            [
              'tr',
              {},
              [
                'td',
                {
                  align: 'center',
                  style: `background-color: ${cta.color}; border-radius: 6px;`,
                },
                [
                  'a',
                  {
                    href: cta.url,
                    target: '_blank',
                    style: 'display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; font-size: 16px;',
                  },
                  cta.text,
                ],
              ],
            ],
          ],
        ]);
      }
      
      return elements.length > 0 ? elements : [['span', {}, '']];
    };

    // For equal columns, both sides are text
    if (isEqual) {
      const leftElements = textToElements(leftContent);
      const rightElements = textToElements(rightContent);
      
      return [
        'table',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-two-column': '',
          // Ensure layout is explicitly persisted for parseHTML + preview
          'data-layout': layout,
          cellpadding: '0',
          cellspacing: '0',
          border: '0',
          width: '100%',
          style: `background-color: ${backgroundColor}; border-radius: 8px; padding: 24px; margin: 16px 0;`,
        }),
        [
          'tbody',
          {},
          [
            'tr',
            {},
            [
              'td',
              {
                'data-column': 'left',
                valign: 'top',
                width: '50%',
                style: 'padding: 0 16px 0 0; vertical-align: top;',
              },
              ['div', { style: 'font-size: 16px; line-height: 1.6;' }, ...leftElements],
            ],
            [
              'td',
              {
                'data-column': 'right',
                valign: 'top',
                width: '50%',
                style: 'padding: 0 0 0 16px; vertical-align: top;',
              },
              ['div', { style: 'font-size: 16px; line-height: 1.6;' }, ...rightElements],
            ],
          ],
        ],
      ];
    }

    // For image layouts - determine text content based on layout
    const textContent = isImageLeft ? rightContent : leftContent;
    const textElements = textToElements(textContent);

    // Image element for the image side
    const imageElement = [
      'img',
      {
        src: imageUrl,
        alt: 'Newsletter image',
        style: 'max-width: 100%; width: 100%; height: auto; border-radius: 8px; display: block;',
      },
    ];

    // Text element for the text side - properly nested with padding for gap from image
    const textElement = [
      'div',
      { style: 'font-size: 16px; line-height: 1.6; padding: 0 8px;' },
      ...textElements,
    ];

    const leftCellContent = isImageLeft ? imageElement : textElement;
    const rightCellContent = isImageLeft ? textElement : imageElement;

    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-two-column': '',
        // Ensure layout is explicitly persisted for parseHTML + preview
        'data-layout': layout,
        cellpadding: '0',
        cellspacing: '0',
        border: '0',
        width: '100%',
        style: `background-color: ${backgroundColor}; border-radius: 8px; padding: 24px; margin: 16px 0;`,
      }),
      [
        'tbody',
        {},
        [
          'tr',
          {},
          [
            'td',
            {
              'data-column': 'left',
              valign: 'top',
              width: '50%',
              style: 'padding: 0 16px 0 0; vertical-align: top;',
            },
            leftCellContent,
          ],
          [
            'td',
            {
              'data-column': 'right',
              valign: 'top',
              width: '50%',
              style: 'padding: 0 0 0 16px; vertical-align: top;',
            },
            rightCellContent,
          ],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setTwoColumn:
        (layout: TwoColumnLayout, imageUrl?: string) =>
        ({ commands }) => {
          const attrs: any = { layout };
          if (imageUrl) {
            attrs.imageUrl = imageUrl;
          }
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
