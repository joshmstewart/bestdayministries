import { Node, mergeAttributes } from '@tiptap/core';

export type StyledBoxStyle = 
  | 'light-gray' 
  | 'purple-gradient' 
  | 'white-bordered'
  | 'warm-gradient'
  | 'blue-info'
  | 'green-success'
  | 'amber-highlight'
  | 'dark-charcoal';

export interface StyledBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledBox: {
      setStyledBox: (style: StyledBoxStyle) => ReturnType;
      toggleStyledBox: (style: StyledBoxStyle) => ReturnType;
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
          const bg = element.style.background || element.style.backgroundColor;
          if (bg.includes('667eea') || bg.includes('764ba2')) return 'purple-gradient';
          if (bg.includes('f97316') || bg.includes('ea580c')) return 'warm-gradient';
          if (bg.includes('#f3f4f6') || bg.includes('rgb(243, 244, 246)')) return 'light-gray';
          if (bg.includes('#dbeafe') || bg.includes('rgb(219, 234, 254)')) return 'blue-info';
          if (bg.includes('#dcfce7') || bg.includes('rgb(220, 252, 231)')) return 'green-success';
          if (bg.includes('#fef3c7') || bg.includes('rgb(254, 243, 199)')) return 'amber-highlight';
          if (bg.includes('#1f2937') || bg.includes('rgb(31, 41, 55)')) return 'dark-charcoal';
          return 'white-bordered';
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
    };
  },
});
