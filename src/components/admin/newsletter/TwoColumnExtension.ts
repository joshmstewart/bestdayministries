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
          // Strip HTML tags and decode for editing
          const html = leftCell?.innerHTML || '';
          return html.replace(/<[^>]*>/g, '').trim();
        },
      },
      rightContent: {
        default: 'Your Headline\n\nAdd your content here. This text will appear on the right side of the layout.',
        parseHTML: element => {
          const rightCell = element.querySelector('td[data-column="right"]');
          // Strip HTML tags and decode for editing
          const html = rightCell?.innerHTML || '';
          return html.replace(/<[^>]*>/g, '').trim();
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
    // First line becomes headline, rest becomes body
    const textToElements = (text: string): any[] => {
      const safeText = typeof text === 'string' ? text : '';
      const lines = safeText.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return [['span', {}, '']];
      
      const headline = lines[0];
      const body = lines.slice(1).join(' ');
      
      const elements: any[] = [
        ['h2', { style: 'margin: 16px 0 16px 0; font-size: 24px; font-weight: bold;' }, headline]
      ];

      if (body) {
        elements.push(['p', { style: 'margin: 0; font-size: 16px; line-height: 1.6;' }, body]);
      }
      
      return elements;
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
