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
  | 'forest-accent';

export interface StyledBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledBox: {
      setStyledBox: (style: StyledBoxStyle) => ReturnType;
      toggleStyledBox: (style: StyledBoxStyle) => ReturnType;
      updateStyledBoxStyle: (style: StyledBoxStyle) => ReturnType;
    };
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
          
          return 'light-gray';
        },
        renderHTML: attributes => {
          return { 'data-style': attributes.style };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-styled-box]',
      },
      // Fallback: parse divs with inline styles that match our styled boxes
      {
        tag: 'div',
        getAttrs: (element: HTMLElement) => {
          const style = element.getAttribute('style') || '';
          const bg = style.toLowerCase();
          
          // Check if this div has styling that matches our styled boxes
          if (
            bg.includes('#f3f4f6') || bg.includes('rgb(243, 244, 246)') || // light-gray
            bg.includes('667eea') || bg.includes('764ba2') || // purple-gradient
            bg.includes('#dbeafe') || bg.includes('rgb(219, 234, 254)') || // blue-info
            bg.includes('#dcfce7') || bg.includes('rgb(220, 252, 231)') || // green-success
            bg.includes('#fef3c7') || bg.includes('rgb(254, 243, 199)') || // amber-highlight
            bg.includes('#1f2937') || bg.includes('rgb(31, 41, 55)') || // dark-charcoal
            bg.includes('#e8650d') || bg.includes('rgb(232, 101, 13)') || // burnt-orange
            bg.includes('#c2410c') || bg.includes('rgb(194, 65, 12)') || // deep-orange
            bg.includes('#eab308') || bg.includes('rgb(234, 179, 8)') || // mustard-gold
            bg.includes('#faf5ef') || bg.includes('rgb(250, 245, 239)') || // warm-cream
            bg.includes('radial-gradient') && bg.includes('hsl(24') || // sunset-gradient
            bg.includes('#f97316') || bg.includes('rgb(249, 115, 22)') || // warm-gradient
            bg.includes('#1a1a1a') || bg.includes('rgb(26, 26, 26)') || // brand-dark
            bg.includes('#f5e6d3') || bg.includes('rgb(245, 230, 211)') || // sand-light
            bg.includes('#14532d') || bg.includes('rgb(20, 83, 45)') || // forest-accent
            (bg.includes('background') && bg.includes('white') && bg.includes('border')) // white-bordered
          ) {
            return {};
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const style = HTMLAttributes['data-style'] || 'light-gray';
    let styleAttr = '';
    
    switch (style) {
      case 'purple-gradient':
        styleAttr = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'warm-gradient':
        styleAttr = 'background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'blue-info':
        styleAttr = 'background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #1e40af;';
        break;
      case 'green-success':
        styleAttr = 'background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #166534;';
        break;
      case 'amber-highlight':
        styleAttr = 'background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #92400e;';
        break;
      case 'dark-charcoal':
        styleAttr = 'background-color: #1f2937; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'white-bordered':
        styleAttr = 'background: white; border: 2px solid #e5e7eb; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0;';
        break;
      case 'burnt-orange':
        styleAttr = 'background-color: #e8650d; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'deep-orange':
        styleAttr = 'background-color: #c2410c; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'mustard-gold':
        styleAttr = 'background-color: #eab308; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #1a1a1a;';
        break;
      case 'warm-cream':
        styleAttr = 'background-color: #faf5ef; border: 2px solid #e8650d; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #1a1a1a;';
        break;
      case 'sunset-gradient':
        styleAttr = 'background: radial-gradient(circle at 20% 30%, hsl(46, 95%, 55%, 0.25) 0%, transparent 25%), radial-gradient(circle at 75% 20%, hsl(46, 95%, 55%, 0.2) 0%, transparent 30%), radial-gradient(circle at 85% 70%, hsl(46, 95%, 55%, 0.28) 0%, transparent 25%), radial-gradient(circle at 40% 80%, hsl(46, 95%, 55%, 0.18) 0%, transparent 35%), radial-gradient(circle at 15% 85%, hsl(46, 95%, 55%, 0.15) 0%, transparent 28%), hsl(24, 85%, 56%); padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'brand-dark':
        styleAttr = 'background-color: #1a1a1a; border-top: 4px solid #e8650d; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'sand-light':
        styleAttr = 'background-color: #f5e6d3; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: #1a1a1a;';
        break;
      case 'forest-accent':
        styleAttr = 'background-color: #14532d; border-left: 4px solid #eab308; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0; color: white;';
        break;
      case 'light-gray':
      default:
        styleAttr = 'background-color: #f3f4f6; padding: 2rem; border-radius: 0.5rem; margin: 1rem 0;';
        break;
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
        (style: StyledBoxStyle) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, { style });
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
    };
  },
});
