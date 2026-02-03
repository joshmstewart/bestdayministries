import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';

export const CTAButtonNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, selected, deleteNode, editor, getPos } = props;
  const { text, url, color } = node.attrs;

  const handleDelete = (e: React.MouseEvent) => {
    // ProseMirror can swallow/short-circuit click events inside NodeViews.
    // Using mousedown + contentEditable={false} makes this reliably interactive.
    e.preventDefault();
    e.stopPropagation();

    // Preferred: TipTap provided helper
    if (typeof deleteNode === 'function') {
      deleteNode();
      return;
    }

    // Fallback: delete the node range manually
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
    }
  };

  return (
    <NodeViewWrapper
      className="cta-button-wrapper"
      data-selected={selected}
      // Atom node UI: mark as non-editable so pointer events behave predictably.
      contentEditable={false}
    >
      <div className="relative group" style={{ margin: '16px auto', width: 'fit-content' }}>
        {/* Delete button - visible on hover */}
        <button
          type="button"
          contentEditable={false}
          onMouseDown={handleDelete}
          className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
          title="Remove CTA Button"
        >
          <X className="h-3 w-3" />
        </button>
        
        {/* CTA Button preview */}
        <div
          style={{
            backgroundColor: color,
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            contentEditable={false}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              // Keep email-preview behavior consistent (white text) while using HSL format.
              color: 'hsl(0 0% 100%)',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
            onMouseDown={(e) => {
              // Prevent ProseMirror from trying to place a text cursor / navigating
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.preventDefault()} // Prevent navigation in editor
          >
            {text}
          </a>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
