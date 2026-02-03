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

    // Ensure we run before ProseMirror handlers when possible.
    // (React capture handler also set on the button, but keep this for safety.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e.nativeEvent as any)?.stopImmediatePropagation?.();

    // Most reliable: delete via a direct ProseMirror transaction at the node position.
    // Using `view.dispatch` avoids any command/plugin short-circuiting.
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      try {
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        editor.view.dispatch(tr);
        editor.view.focus();
      } catch (err) {
        // Keep a fallback below
        console.error('CTA delete failed', err);
      }
      return;
    }

    // Fallback: TipTap helper
    if (typeof deleteNode === 'function') {
      deleteNode();
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
          // Use capture so ProseMirror can't swallow the event before React sees it.
          onMouseDownCapture={handleDelete}
          onPointerDownCapture={(e) => handleDelete(e as unknown as React.MouseEvent)}
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
