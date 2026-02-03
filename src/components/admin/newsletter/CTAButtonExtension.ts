import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CTAButtonNodeView } from './CTAButtonNodeView';
import { getCTASizing } from './ctaButtonStyles';

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

  selectable: true, // Allow clicking to select the node for keyboard deletion

  // Lower priority than TwoColumn (1000) so nested CTAs inside magazine layouts
  // are NOT parsed as standalone blocks (they get extracted as [CTA:...] markers instead)
  priority: 100,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CTAButtonNodeView);
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
          // Try td with background-color first
          let td = element.querySelector('td[style*="background-color"]');
          if (td) {
            const style = td.getAttribute('style') || '';
            const match = style.match(/background-color:\s*([^;]+)/);
            if (match) return match[1].trim();
          }
          // Also check for background (shorthand) in any td
          td = element.querySelector('td[style*="background:"]');
          if (td) {
            const style = td.getAttribute('style') || '';
            const match = style.match(/background:\s*([^;]+)/);
            if (match) return match[1].trim();
          }
          return '#f97316';
        },
      },
      width: {
        default: 'auto',
        parseHTML: element => {
          const tableStyle = element.getAttribute('style') || '';
          // Check if table has width: 100%
          if (tableStyle.includes('width: 100%') || tableStyle.includes('width:100%')) {
            return 'full';
          }
          return 'auto';
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        // Match our CTA button table structure with data attribute
        tag: 'table[data-cta-button]',
        // IMPORTANT: CTA tables inside magazine/two-column layouts are owned by the
        // TwoColumn extension (they're generated from [CTA:...] markers). If we parse
        // them here, ProseMirror will try to lift them out (often to the bottom).
        getAttrs: (element: HTMLElement) => {
          // PRIMARY defense: explicit marker from TwoColumn.renderHTML()
          if (element.hasAttribute('data-owned-by-two-column')) return false;
          // SECONDARY defense: ancestry check (fallback for edge cases)
          if (element.closest('table[data-two-column]')) return false;
          return {};
        },
        priority: 100,
      },
      {
        // Fallback: match email-safe button tables without data attribute
        // (e.g., after edge function processing strips data attributes)
        tag: 'table',
        priority: 99,
        getAttrs: (element: HTMLElement) => {
          // PRIMARY defense: explicit marker from TwoColumn.renderHTML()
          if (element.hasAttribute('data-owned-by-two-column')) return false;
          // SECONDARY defense: ancestry check
          if (element.closest('table[data-two-column]')) return false;

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
          
          // Must have a td with background styling and an anchor
          const tds = element.querySelectorAll('td');
          let hasBackgroundTd = false;
          for (const td of tds) {
            const tdStyle = td.getAttribute('style') || '';
            if (tdStyle.includes('background-color') || tdStyle.includes('background:')) {
              hasBackgroundTd = true;
              break;
            }
          }
          
          const link = element.querySelector('a');
          
          if (!hasBackgroundTd || !link) {
            return false;
          }
          
          // Final check: must be a simple single-cell CTA structure (1 row, 1 cell)
          const rows = element.querySelectorAll('tr');
          if (rows.length !== 1) return false;
          const cells = rows[0].querySelectorAll('td, th');
          if (cells.length !== 1) return false;
          
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { text, url, color, width } = HTMLAttributes;
    const isFullWidth = width === 'full';

    const { padding, fontSize } = getCTASizing(isFullWidth ? 'full' : 'auto');
    
    // Render as email-safe table structure with data attribute for identification
    return [
      'table',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-cta-button': '',
        cellpadding: '0',
        cellspacing: '0',
        border: '0',
        style: isFullWidth 
          ? 'margin: 16px auto; width: 100%;' 
          : 'margin: 16px auto;',
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
                style: `display: ${isFullWidth ? 'block' : 'inline-block'}; padding: ${padding}; color: white; text-decoration: none; font-weight: bold; font-size: ${fontSize}; text-align: center;`,
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

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state;
        
        // Check if a CTA node is selected via NodeSelection (has .node property)
        const nodeSelection = selection as { node?: { type: { name: string } } };
        if (nodeSelection.node?.type.name === this.name) {
          return this.editor.commands.deleteSelection();
        }
        
        // Fallback: If cursor is right after a CTA, delete it
        if (selection.empty) {
          const pos = selection.$anchor.pos;
          const nodeBefore = this.editor.state.doc.resolve(pos).nodeBefore;
          if (nodeBefore?.type.name === this.name) {
            return this.editor.commands.deleteRange({
              from: pos - nodeBefore.nodeSize,
              to: pos,
            });
          }
        }
        return false;
      },
      Delete: () => {
        const { selection } = this.editor.state;
        
        // Check if a CTA node is selected via NodeSelection
        const nodeSelection = selection as { node?: { type: { name: string } } };
        if (nodeSelection.node?.type.name === this.name) {
          return this.editor.commands.deleteSelection();
        }
        
        // Fallback: If cursor is right before a CTA, delete it
        if (selection.empty) {
          const pos = selection.$anchor.pos;
          const nodeAfter = this.editor.state.doc.resolve(pos).nodeAfter;
          if (nodeAfter?.type.name === this.name) {
            return this.editor.commands.deleteRange({
              from: pos,
              to: pos + nodeAfter.nodeSize,
            });
          }
        }
        return false;
      },
    };
  },
});
