import { Node, mergeAttributes } from '@tiptap/core';

export type StyledBoxStyle = 
  | 'light-gray' 
  | 'purple-gradient' 
  | 'white-bordered'
  | 'warm-gradient'
  | 'blue-info'
  | 'green-success'
  | 'amber-highlight'
  | 'dark-charcoal'
  | 'burnt-orange'
  | 'deep-orange'
  | 'mustard-gold'
  | 'warm-cream'
  | 'sunset-gradient'
  | 'brand-dark'
  | 'sand-light'
  | 'forest-accent'
  // Soft pastel colors
  | 'soft-pink'
  | 'soft-purple'
  | 'soft-teal'
  | 'soft-coral'
  | 'soft-indigo'
  | 'soft-rose'
  | 'soft-sky'
  | 'soft-mint'
  | 'soft-peach'
  | 'soft-lavender';

export type StyledBoxWidth = 'full' | 'fit';

export interface StyledBoxOptions {
  HTMLAttributes: Record<string, any>;
}

// Shared style definitions used by both Add and Change dialogs
export const STYLED_BOX_STYLES: Array<{
  key: StyledBoxStyle;
  label: string;
  bgColor: string;
  text: string;
  border?: string;
  isGradient?: boolean;
  bgStyle?: string; // for gradients
}> = [
  { key: 'warm-cream', label: 'Warm Cream', bgColor: '#faf5ef', text: '#1a1a1a', border: '2px solid #e8650d' },
  { key: 'sand-light', label: 'Sand', bgColor: '#f5e6d3', text: '#1a1a1a' },
  { key: 'light-gray', label: 'Light Gray', bgColor: '#f3f4f6', text: '#374151' },
  { key: 'white-bordered', label: 'White', bgColor: '#ffffff', text: '#374151', border: '2px solid #e5e7eb' },
  // Soft pastel colors - inspired by vendor theme palette
  { key: 'soft-pink', label: 'Soft Pink', bgColor: '#fce7f3', text: '#9d174d', border: '2px solid #ec4899' },
  { key: 'soft-purple', label: 'Soft Purple', bgColor: '#f3e8ff', text: '#6b21a8', border: '2px solid #a855f7' },
  { key: 'soft-teal', label: 'Soft Teal', bgColor: '#ccfbf1', text: '#115e59', border: '2px solid #14b8a6' },
  { key: 'soft-coral', label: 'Soft Coral', bgColor: '#ffedd5', text: '#9a3412', border: '2px solid #f97316' },
  { key: 'soft-indigo', label: 'Soft Indigo', bgColor: '#e0e7ff', text: '#3730a3', border: '2px solid #6366f1' },
  { key: 'soft-rose', label: 'Soft Rose', bgColor: '#ffe4e6', text: '#9f1239', border: '2px solid #f43f5e' },
  { key: 'soft-sky', label: 'Soft Sky', bgColor: '#e0f2fe', text: '#075985', border: '2px solid #0ea5e9' },
  { key: 'soft-mint', label: 'Soft Mint', bgColor: '#d1fae5', text: '#065f46', border: '2px solid #10b981' },
  { key: 'soft-peach', label: 'Soft Peach', bgColor: '#fed7aa', text: '#7c2d12', border: '2px solid #ea580c' },
  { key: 'soft-lavender', label: 'Soft Lavender', bgColor: '#ede9fe', text: '#5b21b6', border: '2px solid #8b5cf6' },
  // Existing styles
  { key: 'sunset-gradient', label: 'Sunset', bgColor: '#ea8b47', text: 'white', isGradient: true, bgStyle: 'radial-gradient(circle at 20% 30%, hsl(46, 95%, 55%, 0.25) 0%, transparent 25%), radial-gradient(circle at 75% 20%, hsl(46, 95%, 55%, 0.2) 0%, transparent 30%), hsl(24, 85%, 56%)' },
  { key: 'burnt-orange', label: 'Burnt Orange', bgColor: '#e8650d', text: 'white' },
  { key: 'deep-orange', label: 'Deep Orange', bgColor: '#c2410c', text: 'white' },
  { key: 'mustard-gold', label: 'Mustard Gold', bgColor: '#eab308', text: '#1a1a1a' },
  { key: 'warm-gradient', label: 'Warm Gradient', bgColor: '#f97316', text: 'white', isGradient: true, bgStyle: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
  { key: 'dark-charcoal', label: 'Charcoal', bgColor: '#1f2937', text: 'white' },
  { key: 'brand-dark', label: 'Brand Dark', bgColor: '#1a1a1a', text: 'white', border: '4px solid #e8650d' },
  { key: 'purple-gradient', label: 'Purple', bgColor: '#764ba2', text: 'white', isGradient: true, bgStyle: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { key: 'blue-info', label: 'Blue Info', bgColor: '#dbeafe', text: '#1e40af', border: '4px solid #3b82f6' },
  { key: 'green-success', label: 'Green', bgColor: '#dcfce7', text: '#166534', border: '4px solid #22c55e' },
  { key: 'amber-highlight', label: 'Amber', bgColor: '#fef3c7', text: '#92400e', border: '4px solid #f59e0b' },
  { key: 'forest-accent', label: 'Forest', bgColor: '#14532d', text: 'white', border: '4px solid #eab308' },
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledBox: {
      setStyledBox: (style: StyledBoxStyle, width?: StyledBoxWidth) => ReturnType;
      toggleStyledBox: (style: StyledBoxStyle) => ReturnType;
      updateStyledBoxStyle: (style: StyledBoxStyle) => ReturnType;
      updateStyledBoxWidth: (width: StyledBoxWidth) => ReturnType;
    };
  }
}

// Helper to get base style string for a given style key
function getBaseStyleString(style: StyledBoxStyle): string {
  // Compact spacing so one-line boxes don't look overly tall
  // Vertical: 0.75rem (~12px), Horizontal: 1.25rem (~20px)
  const boxPadding = 'padding: 0.75rem 1.25rem;';
  const boxMargin = 'margin: 1rem 0;';

  switch (style) {
    case 'purple-gradient':
      return `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'warm-gradient':
      return `background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'blue-info':
      return `background-color: #dbeafe; border-left: 4px solid #3b82f6; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #1e40af;`;
    case 'green-success':
      return `background-color: #dcfce7; border-left: 4px solid #22c55e; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #166534;`;
    case 'amber-highlight':
      return `background-color: #fef3c7; border-left: 4px solid #f59e0b; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #92400e;`;
    case 'dark-charcoal':
      return `background-color: #1f2937; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'white-bordered':
      return `background: white; border: 2px solid #e5e7eb; ${boxPadding} border-radius: 0.5rem; ${boxMargin}`;
    case 'burnt-orange':
      return `background-color: #e8650d; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'deep-orange':
      return `background-color: #c2410c; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'mustard-gold':
      return `background-color: #eab308; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #1a1a1a;`;
    case 'warm-cream':
      return `background-color: #faf5ef; border: 2px solid #e8650d; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #1a1a1a;`;
    case 'sunset-gradient':
      return `background: radial-gradient(circle at 20% 30%, hsl(46, 95%, 55%, 0.25) 0%, transparent 25%), radial-gradient(circle at 75% 20%, hsl(46, 95%, 55%, 0.2) 0%, transparent 30%), radial-gradient(circle at 85% 70%, hsl(46, 95%, 55%, 0.28) 0%, transparent 25%), radial-gradient(circle at 40% 80%, hsl(46, 95%, 55%, 0.18) 0%, transparent 35%), radial-gradient(circle at 15% 85%, hsl(46, 95%, 55%, 0.15) 0%, transparent 28%), hsl(24, 85%, 56%); ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'brand-dark':
      return `background-color: #1a1a1a; border-top: 4px solid #e8650d; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    case 'sand-light':
      return `background-color: #f5e6d3; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #1a1a1a;`;
    case 'forest-accent':
      return `background-color: #14532d; border-left: 4px solid #eab308; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: white;`;
    // Soft pastel colors
    case 'soft-pink':
      return `background-color: #fce7f3; border: 2px solid #ec4899; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #9d174d;`;
    case 'soft-purple':
      return `background-color: #f3e8ff; border: 2px solid #a855f7; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #6b21a8;`;
    case 'soft-teal':
      return `background-color: #ccfbf1; border: 2px solid #14b8a6; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #115e59;`;
    case 'soft-coral':
      return `background-color: #ffedd5; border: 2px solid #f97316; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #9a3412;`;
    case 'soft-indigo':
      return `background-color: #e0e7ff; border: 2px solid #6366f1; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #3730a3;`;
    case 'soft-rose':
      return `background-color: #ffe4e6; border: 2px solid #f43f5e; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #9f1239;`;
    case 'soft-sky':
      return `background-color: #e0f2fe; border: 2px solid #0ea5e9; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #075985;`;
    case 'soft-mint':
      return `background-color: #d1fae5; border: 2px solid #10b981; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #065f46;`;
    case 'soft-peach':
      return `background-color: #fed7aa; border: 2px solid #ea580c; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #7c2d12;`;
    case 'soft-lavender':
      return `background-color: #ede9fe; border: 2px solid #8b5cf6; ${boxPadding} border-radius: 0.5rem; ${boxMargin} color: #5b21b6;`;
    case 'light-gray':
    default:
      return `background-color: #f3f4f6; ${boxPadding} border-radius: 0.5rem; ${boxMargin}`;
  }
}

export const StyledBox = Node.create<StyledBoxOptions>({
  name: 'styledBox',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      style: {
        default: 'light-gray',
        parseHTML: element => {
          // First check data attribute
          const dataStyle = element.getAttribute('data-style');
          if (dataStyle) return dataStyle;
          
          // Fallback to parsing inline styles
          const inlineStyle = element.getAttribute('style') || '';
          const bg = inlineStyle.toLowerCase();
          
          if (bg.includes('radial-gradient') && bg.includes('hsl(24')) return 'sunset-gradient';
          if (bg.includes('667eea') || bg.includes('764ba2')) return 'purple-gradient';
          if (bg.includes('#f97316') || bg.includes('rgb(249, 115, 22)') || (bg.includes('f97316') && bg.includes('ea580c'))) return 'warm-gradient';
          if (bg.includes('#e8650d') || bg.includes('rgb(232, 101, 13)')) return 'burnt-orange';
          if (bg.includes('#c2410c') || bg.includes('rgb(194, 65, 12)')) return 'deep-orange';
          if (bg.includes('#eab308') || bg.includes('rgb(234, 179, 8)')) return 'mustard-gold';
          if (bg.includes('#faf5ef') || bg.includes('rgb(250, 245, 239)')) return 'warm-cream';
          if (bg.includes('#f3f4f6') || bg.includes('rgb(243, 244, 246)')) return 'light-gray';
          if (bg.includes('#dbeafe') || bg.includes('rgb(219, 234, 254)')) return 'blue-info';
          if (bg.includes('#dcfce7') || bg.includes('rgb(220, 252, 231)')) return 'green-success';
          if (bg.includes('#fef3c7') || bg.includes('rgb(254, 243, 199)')) return 'amber-highlight';
          if (bg.includes('#1f2937') || bg.includes('rgb(31, 41, 55)')) return 'dark-charcoal';
          if (bg.includes('#1a1a1a') || bg.includes('rgb(26, 26, 26)')) return 'brand-dark';
          if (bg.includes('#f5e6d3') || bg.includes('rgb(245, 230, 211)')) return 'sand-light';
          if (bg.includes('#14532d') || bg.includes('rgb(20, 83, 45)')) return 'forest-accent';
          if (bg.includes('white') && bg.includes('border')) return 'white-bordered';
          // Soft pastel colors parsing
          if (bg.includes('#fce7f3') || bg.includes('rgb(252, 231, 243)')) return 'soft-pink';
          if (bg.includes('#f3e8ff') || bg.includes('rgb(243, 232, 255)')) return 'soft-purple';
          if (bg.includes('#ccfbf1') || bg.includes('rgb(204, 251, 241)')) return 'soft-teal';
          if (bg.includes('#ffedd5') || bg.includes('rgb(255, 237, 213)')) return 'soft-coral';
          if (bg.includes('#e0e7ff') || bg.includes('rgb(224, 231, 255)')) return 'soft-indigo';
          if (bg.includes('#ffe4e6') || bg.includes('rgb(255, 228, 230)')) return 'soft-rose';
          if (bg.includes('#e0f2fe') || bg.includes('rgb(224, 242, 254)')) return 'soft-sky';
          if (bg.includes('#d1fae5') || bg.includes('rgb(209, 250, 229)')) return 'soft-mint';
          if (bg.includes('#fed7aa') || bg.includes('rgb(254, 215, 170)')) return 'soft-peach';
          if (bg.includes('#ede9fe') || bg.includes('rgb(237, 233, 254)')) return 'soft-lavender';
          
          return 'light-gray';
        },
        renderHTML: attributes => {
          return { 'data-style': attributes.style };
        },
      },
      width: {
        default: 'full',
        parseHTML: element => {
          // Check data-width attribute first
          const dataWidth = element.getAttribute('data-width');
          if (dataWidth === 'fit') return 'fit';
          
          // Check if parent is the centering wrapper (indicates fit width)
          const parent = element.parentElement;
          if (parent?.hasAttribute('data-styled-box-wrapper')) {
            return 'fit';
          }
          
          // Also check inline style for inline-block
          const inlineStyle = element.getAttribute('style') || '';
          if (inlineStyle.includes('inline-block')) return 'fit';
          
          return 'full';
        },
        renderHTML: attributes => {
          return { 'data-width': attributes.width };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-styled-box]',
      },
      // Also accept nodes created by the extension (data-style is always emitted)
      // NOTE: Do NOT parse generic divs by background color. That can silently
      // convert unrelated layout elements (like headers/badges) into styledBox
      // nodes, which rewrites the HTML and "breaks" templates.
      {
        tag: 'div[data-style]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const style = HTMLAttributes['data-style'] || 'light-gray';
    const width = HTMLAttributes['data-width'] || 'full';
    
    let styleAttr = getBaseStyleString(style);
    
    // For fit width, we need a wrapper to center it
    if (width === 'fit') {
      // Inline-block to shrink-wrap content, centered via wrapper's text-align
      styleAttr = styleAttr.replace('margin: 1rem 0;', 'margin: 0; display: inline-block;');
      
      // Return a wrapper div with text-align center, containing the styled box
      return [
        'div',
        { style: 'text-align: center; margin: 1rem 0;', 'data-styled-box-wrapper': '' },
        [
          'div',
          mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            'data-styled-box': '',
            style: styleAttr,
          }),
          0,
        ],
      ];
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-styled-box': '',
        style: styleAttr,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setStyledBox:
        (style: StyledBoxStyle, width: StyledBoxWidth = 'full') =>
        ({ commands }) => {
          return commands.wrapIn(this.name, { style, width });
        },
      toggleStyledBox:
        (style: StyledBoxStyle) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, { style });
        },
      updateStyledBoxStyle:
        (style: StyledBoxStyle) =>
        ({ tr, state, dispatch }) => {
          // Find the styledBox node by walking up from selection
          const { selection } = state;
          const $from = selection.$from;
          
          // Walk up the tree to find the styledBox
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === 'styledBox') {
              const pos = $from.before(d);
              
              if (dispatch) {
                // CRITICAL: Pass node.type explicitly to preserve content structure
                const newAttrs = { ...node.attrs, style };
                tr.setNodeMarkup(pos, node.type, newAttrs, node.marks);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      updateStyledBoxWidth:
        (width: StyledBoxWidth) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const $from = selection.$from;
          
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === 'styledBox') {
              const pos = $from.before(d);
              
              if (dispatch) {
                const newAttrs = { ...node.attrs, width };
                tr.setNodeMarkup(pos, node.type, newAttrs, node.marks);
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
