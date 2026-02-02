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
        default: 'https://placehold.co/400x300/e8650d/white?text=Your+Image',
        parseHTML: element => {
          const img = element.querySelector('img');
          return img?.getAttribute('src') || '';
        },
      },
      backgroundColor: {
        default: '#faf5ef',
        parseHTML: element => {
          const style = element.getAttribute('style') || '';
          const match = style.match(/background-color:\s*([^;]+)/);
          return match?.[1]?.trim() || '#faf5ef';
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

  renderHTML({ HTMLAttributes }) {
    const { layout, leftContent, rightContent, imageUrl, backgroundColor } = HTMLAttributes;
    
    const isImageLeft = layout === 'image-left-text-right';
    const isEqual = layout === 'equal-columns';
    
    // Helper function to convert plain text to styled HTML
    // First line becomes headline, rest becomes body
    const textToHtml = (text: string) => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return '';
      
      const headline = lines[0];
      const body = lines.slice(1).join(' ');
      
      let html = `<h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold;">${headline}</h2>`;
      if (body) {
        html += `<p style="margin: 0; font-size: 16px; line-height: 1.6;">${body}</p>`;
      }
      return html;
    };

    const leftHtml = textToHtml(leftContent);
    const rightHtml = textToHtml(rightContent);

    // For equal columns, both sides are text
    if (isEqual) {
      return [
        'table',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-two-column': '',
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
              ['div', { style: 'font-size: 16px; line-height: 1.6;' }, leftHtml || leftContent],
            ],
            [
              'td',
              {
                'data-column': 'right',
                valign: 'top',
                width: '50%',
                style: 'padding: 0 0 0 16px; vertical-align: top;',
              },
              ['div', { style: 'font-size: 16px; line-height: 1.6;' }, rightHtml || rightContent],
            ],
          ],
        ],
      ];
    }

    // For image layouts - determine text content based on layout
    const textContent = isImageLeft ? rightContent : leftContent;
    const textHtml = textToHtml(textContent);

    // Image element for the image side
    const imageElement = [
      'img',
      {
        src: imageUrl,
        alt: 'Newsletter image',
        style: 'width: 100%; height: auto; border-radius: 8px; display: block;',
      },
    ];

    // Text element for the text side
    const textElement = [
      'div',
      { style: 'font-size: 16px; line-height: 1.6;' },
      textHtml || textContent,
    ];

    const leftCellContent = isImageLeft ? imageElement : textElement;
    const rightCellContent = isImageLeft ? textElement : imageElement;

    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-two-column': '',
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
