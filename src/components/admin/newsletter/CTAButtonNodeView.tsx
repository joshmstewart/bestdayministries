import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { X } from 'lucide-react';

export const CTAButtonNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, selected, deleteNode, editor, getPos } = props;
  const { text, url, color } = node.attrs;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.nativeEvent as any)?.stopImmediatePropagation?.();

    // Strategy 1: Direct ProseMirror transaction (most reliable)
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number' && !isNaN(pos) && pos >= 0) {
        try {
          const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
          editor.view.dispatch(tr);
          editor.view.focus();
          return;
        } catch (err) {
          console.warn('CTA delete via transaction failed:', err);
        }
      }
    }

    // Strategy 2: Select the node and delete selection
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number' && !isNaN(pos) && pos >= 0) {
        try {
          const nodeSelection = NodeSelection.create(editor.state.doc, pos);
          const tr = editor.state.tr.setSelection(nodeSelection);
          editor.view.dispatch(tr);
          editor.commands.deleteSelection();
          editor.view.focus();
          return;
        } catch (err) {
          console.warn('CTA NodeSelection delete failed:', err);
        }
      }
    }

    // Strategy 3: TipTap's deleteNode helper
    if (typeof deleteNode === 'function') {
      deleteNode();
      return;
    }

    // Strategy 4: Force focus and use command chain
    editor?.chain().focus().deleteNode('ctaButton').run();
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    // Don't interfere with delete button clicks
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Select the node on click
    if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number' && !isNaN(pos) && pos >= 0) {
        try {
          const nodeSelection = NodeSelection.create(editor.state.doc, pos);
          const tr = editor.state.tr.setSelection(nodeSelection);
          editor.view.dispatch(tr);
          editor.view.focus();
        } catch (err) {
          // Ignore selection errors
        }
      }
    }
  };

  return (
    <NodeViewWrapper
      className="cta-button-wrapper"
      data-selected={selected}
      contentEditable={false}
      onClick={handleWrapperClick}
    >
      <div className="relative group" style={{ margin: '16px auto', width: 'fit-content' }}>
        {/* Delete button - visible on hover */}
        <button
          type="button"
          contentEditable={false}
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
              color: 'hsl(0 0% 100%)',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => e.preventDefault()}
          >
            {text}
          </a>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
