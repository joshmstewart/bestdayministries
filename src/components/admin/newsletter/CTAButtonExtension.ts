import { Node, mergeAttributes } from '@tiptap/core';

export interface CTAButtonOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButton: {
      setCTAButton: (options: { text: string; url: string; color: string }) => ReturnType;
    };
  }
}

export const CTAButton = Node.create<CTAButtonOptions>({
  name: 'ctaButton',

  group: 'block',

  atom: true, // This node is a leaf node, not editable inline

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      text: {
        default: 'Click Here',
        parseHTML: element => {
          const link = element.querySelector('a');
          return link?.textContent || 'Click Here';
        },
      },
      url: {
        default: '#',
        parseHTML: element => {
          const link = element.querySelector('a');
          return link?.getAttribute('href') || '#';
        },
      },
      color: {
        default: '#f97316',
        parseHTML: element => {
          const td = element.querySelector('td[style*="background-color"]');
          const style = td?.getAttribute('style') || '';
          const match = style.match(/background-color:\s*([^;]+)/);
          return match?.[1]?.trim() || '#f97316';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        // Match our CTA button table structure
        tag: 'table[data-cta-button]',
      },
      {
        // Fallback: match email-safe button tables
        tag: 'table',
        getAttrs: (element: HTMLElement) => {
          // Check if this is a CTA button table (centered, with background-color td)
          const cellpadding = element.getAttribute('cellpadding');
          const cellspacing = element.getAttribute('cellspacing');
          const border = element.getAttribute('border');
          const style = element.getAttribute('style') || '';
          
          // Must have email-safe attributes
          if (cellpadding !== '0' || cellspacing !== '0' || border !== '0') {
            return false;
          }
          
          // Must be centered (margin auto)
          if (!style.includes('auto')) {
            return false;
          }
          
          // Must have a td with background-color and an anchor
          const td = element.querySelector('td[style*="background-color"]');
          const link = element.querySelector('a');
          
          if (!td || !link) {
            return false;
          }
          
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { text, url, color } = HTMLAttributes;
    
    // Render as email-safe table structure with data attribute for identification
    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-cta-button': '',
        cellpadding: '0',
        cellspacing: '0',
        border: '0',
        style: 'margin: 16px auto;',
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
              align: 'center',
              style: `background-color: ${color}; border-radius: 6px;`,
            },
            [
              'a',
              {
                href: url,
                target: '_blank',
                style: 'display: inline-block; padding: 12px 24px; color: white; text-decoration: none; font-weight: bold; font-size: 16px;',
              },
              text,
            ],
          ],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setCTAButton:
        (options: { text: string; url: string; color: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
