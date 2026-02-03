import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { X } from 'lucide-react';

export const CTAButtonNodeView: React.FC<NodeViewProps> = ({ node, deleteNode, selected }) => {
  const { text, url, color } = node.attrs;

  return (
    <NodeViewWrapper className="cta-button-wrapper" data-selected={selected}>
      <div className="relative group" style={{ margin: '16px auto', width: 'fit-content' }}>
        {/* Delete button - visible on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
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
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
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
