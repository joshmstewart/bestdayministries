import { Node, mergeAttributes } from '@tiptap/core';

export interface StatsBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export interface StatItem {
  value: string;
  label: string;
  color: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    statsBlock: {
      setStatsBlock: (options: { 
        title: string; 
        stats: StatItem[]; 
        backgroundColor: string;
        titleColor: string;
      }) => ReturnType;
    };
  }
}

export const StatsBlock = Node.create<StatsBlockOptions>({
  name: 'statsBlock',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      title: {
        default: 'By the Numbers',
        parseHTML: element => {
          const h2 = element.querySelector('h2, [data-stats-title]');
          return h2?.textContent || 'By the Numbers';
        },
      },
      stats: {
        default: [
          { value: '0', label: 'Item 1', color: '#f97316' },
          { value: '0', label: 'Item 2', color: '#22c55e' },
          { value: '0', label: 'Item 3', color: '#3b82f6' },
          { value: '0', label: 'Item 4', color: '#8b5cf6' },
        ],
        parseHTML: element => {
          const statElements = element.querySelectorAll('[data-stat-item], td[style*="text-align"]');
          const stats: StatItem[] = [];
          
          statElements.forEach(el => {
            const valueEl = el.querySelector('[data-stat-value], [style*="font-size: 3"]');
            const labelEl = el.querySelector('[data-stat-label], [style*="font-size: 1"]');
            
            if (valueEl && labelEl) {
              const style = valueEl.getAttribute('style') || '';
              const colorMatch = style.match(/color:\s*([^;]+)/);
              
              stats.push({
                value: valueEl.textContent || '0',
                label: labelEl.textContent || 'Label',
                color: colorMatch?.[1]?.trim() || '#f97316',
              });
            }
          });
          
          return stats.length > 0 ? stats : [
            { value: '0', label: 'Item 1', color: '#f97316' },
            { value: '0', label: 'Item 2', color: '#22c55e' },
            { value: '0', label: 'Item 3', color: '#3b82f6' },
            { value: '0', label: 'Item 4', color: '#8b5cf6' },
          ];
        },
      },
      backgroundColor: {
        default: '#1f2937',
        parseHTML: element => {
          const style = element.getAttribute('style') || '';
          const match = style.match(/background(?:-color)?:\s*([^;]+)/);
          if (match) {
            const bg = match[1].trim();
            if (bg.includes('#1f2937') || bg.includes('rgb(31, 41, 55)')) return '#1f2937';
            if (bg.includes('#f3f4f6') || bg.includes('rgb(243, 244, 246)')) return '#f3f4f6';
          }
          return '#1f2937';
        },
      },
      titleColor: {
        default: 'white',
        parseHTML: element => {
          const h2 = element.querySelector('h2, [data-stats-title]');
          const style = h2?.getAttribute('style') || '';
          const match = style.match(/color:\s*([^;]+)/);
          return match?.[1]?.trim() || 'white';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-stats-block]',
      },
      {
        // Fallback: match divs that look like stats blocks
        tag: 'div',
        getAttrs: (element: HTMLElement) => {
          // Check if has a table with stat-like structure
          const table = element.querySelector('table');
          const hasLargeNumbers = element.querySelector('[style*="font-size: 3"], [style*="font-size:3"]');
          
          if (table && hasLargeNumbers) {
            return {};
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { title, stats, backgroundColor, titleColor } = HTMLAttributes;
    const isDark = backgroundColor === '#1f2937';
    const labelColor = isDark ? '#d1d5db' : '#6b7280';
    
    // Build stat cells
    const statCells = (stats as StatItem[]).map((stat) => [
      'td',
      {
        style: 'text-align: center; padding: 1rem; vertical-align: top;',
        'data-stat-item': '',
      },
      [
        'div',
        {
          'data-stat-value': '',
          style: `font-size: 3rem; font-weight: bold; line-height: 1; color: ${stat.color};`,
        },
        stat.value,
      ],
      [
        'div',
        {
          'data-stat-label': '',
          style: `font-size: 1rem; margin-top: 0.5rem; color: ${labelColor};`,
        },
        stat.label,
      ],
    ]);

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-stats-block': '',
        style: `background-color: ${backgroundColor}; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0;`,
      }),
      [
        'h2',
        {
          'data-stats-title': '',
          style: `text-align: center; color: ${titleColor}; font-size: 1.5rem; font-weight: bold; margin-bottom: 1.5rem;`,
        },
        title,
      ],
      [
        'table',
        {
          style: 'width: 100%; border-collapse: collapse;',
        },
        [
          'tbody',
          {},
          [
            'tr',
            {},
            ...statCells,
          ],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setStatsBlock:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
