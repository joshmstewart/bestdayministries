import { Node, mergeAttributes } from '@tiptap/core';

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

  atom: true, // Atomic node - not editable inline

  addOptions() {
    return {
      HTMLAttributes: {},
    };
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
        default: '<h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold;">Your Headline</h2><p style="margin: 0; font-size: 16px; line-height: 1.6;">Add your content here. This text will appear on the left side of the layout.</p>',
        parseHTML: element => {
          const leftCell = element.querySelector('td[data-column="left"]');
          return leftCell?.innerHTML || '';
        },
      },
      rightContent: {
        default: '<h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: bold;">Your Headline</h2><p style="margin: 0; font-size: 16px; line-height: 1.6;">Add your content here. This text will appear on the right side of the layout.</p>',
        parseHTML: element => {
          const rightCell = element.querySelector('td[data-column="right"]');
          return rightCell?.innerHTML || '';
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
    
    // Build the image cell
    const imageCell = [
      'td',
      {
        'data-column': isImageLeft ? 'left' : 'right',
        valign: 'top',
        style: `width: 50%; padding: ${isImageLeft ? '0 16px 0 0' : '0 0 0 16px'};`,
      },
      [
        'img',
        {
          src: imageUrl,
          alt: 'Newsletter image',
          style: 'width: 100%; height: auto; border-radius: 8px; display: block;',
        },
      ],
    ];
    
    // Build the text cell
    const textCell = [
      'td',
      {
        'data-column': isImageLeft ? 'right' : 'left',
        valign: 'top',
        style: `width: 50%; padding: ${isImageLeft ? '0 0 0 16px' : '0 16px 0 0'};`,
      },
      // Use raw HTML content (will be parsed by email clients)
      0, // Placeholder - actual content handled differently
    ];

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
              [
                'div',
                { style: 'font-size: 16px; line-height: 1.6;' },
                leftContent,
              ],
            ],
            [
              'td',
              {
                'data-column': 'right',
                valign: 'top',
                width: '50%',
                style: 'padding: 0 0 0 16px; vertical-align: top;',
              },
              [
                'div',
                { style: 'font-size: 16px; line-height: 1.6;' },
                rightContent,
              ],
            ],
          ],
        ],
      ];
    }

    // For image layouts
    const leftCellContent = isImageLeft 
      ? [
          'img',
          {
            src: imageUrl,
            alt: 'Newsletter image',
            style: 'width: 100%; height: auto; border-radius: 8px; display: block;',
          },
        ]
      : [
          'div',
          { style: 'font-size: 16px; line-height: 1.6;' },
          leftContent,
        ];

    const rightCellContent = isImageLeft
      ? [
          'div',
          { style: 'font-size: 16px; line-height: 1.6;' },
          rightContent,
        ]
      : [
          'img',
          {
            src: imageUrl,
            alt: 'Newsletter image',
            style: 'width: 100%; height: auto; border-radius: 8px; display: block;',
          },
        ];

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
