import { Node, mergeAttributes } from '@tiptap/core';

export interface StyledBoxOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledBox: {
      setStyledBox: (style: 'light-gray' | 'purple-gradient' | 'white-bordered') => ReturnType;
      toggleStyledBox: (style: 'light-gray' | 'purple-gradient' | 'white-bordered') => ReturnType;
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
          if (bg.includes('gradient')) return 'purple-gradient';
          if (bg.includes('#f3f4f6') || bg.includes('rgb(243, 244, 246)')) return 'light-gray';
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
        (style: 'light-gray' | 'purple-gradient' | 'white-bordered') =>
        ({ commands }) => {
          return commands.wrapIn(this.name, { style });
        },
      toggleStyledBox:
        (style: 'light-gray' | 'purple-gradient' | 'white-bordered') =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, { style });
        },
    };
  },
});
