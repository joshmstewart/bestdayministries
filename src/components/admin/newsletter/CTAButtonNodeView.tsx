import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { X, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CTAButtonNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, selected, deleteNode, editor, getPos, updateAttributes } = props;
  const { text, url, color } = node.attrs;
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editUrl, setEditUrl] = useState(url);
  const [editColor, setEditColor] = useState(color);

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

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditText(text);
    setEditUrl(url);
    setEditColor(color);
    setIsEditOpen(true);
  };

  const handleSave = () => {
    updateAttributes({
      text: editText,
      url: editUrl,
      color: editColor,
    });
    setIsEditOpen(false);
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    // Don't interfere with button clicks
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

  const colorOptions = [
    { value: '#f97316', label: 'Orange' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#22c55e', label: 'Green' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#ec4899', label: 'Pink' },
  ];

  return (
    <NodeViewWrapper
      className="cta-button-wrapper"
      data-selected={selected}
      contentEditable={false}
      onClick={handleWrapperClick}
    >
      <div className="relative group" style={{ margin: '16px auto', width: 'fit-content' }}>
        {/* Action buttons - visible on hover */}
        <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            contentEditable={false}
            onMouseDownCapture={handleEdit}
            className="bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:bg-primary/90"
            title="Edit CTA Button"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            contentEditable={false}
            onMouseDownCapture={handleDelete}
            onPointerDownCapture={(e) => handleDelete(e as unknown as React.MouseEvent)}
            className="bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
            title="Remove CTA Button"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit CTA Button</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cta-text">Button Text</Label>
              <Input
                id="cta-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="e.g., Learn More"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-url">Button URL</Label>
              <Input
                id="cta-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditColor(opt.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editColor === opt.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="cta-custom-color" className="text-sm text-muted-foreground">Custom:</Label>
                <Input
                  id="cta-custom-color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-12 h-8 p-0 border-0"
                />
                <span className="text-sm text-muted-foreground">{editColor}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
};
