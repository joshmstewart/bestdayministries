import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { DOMSerializer } from "@tiptap/pm/model";
import { StyledBox, STYLED_BOX_STYLES, StyledBoxStyle, StyledBoxWidth } from "./StyledBoxExtension";
import { CTAButton } from "./CTAButtonExtension";
import { StatsBlock, StatItem } from "./StatsBlockExtension";
import { TwoColumn, TwoColumnLayout } from "./TwoColumnExtension";
import { forwardRef, useImperativeHandle } from "react";

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

// Custom Image extension with resize and alignment support
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./editor-styles.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Video as VideoIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Highlighter,
  RemoveFormatting,
  Crop,
  Square,
  TableIcon,
  Columns,
  Type,
  BarChart3,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RowsIcon,
  ColumnsIcon,
  Palette,
  Maximize2,
} from "lucide-react";
import { useState, useRef } from "react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export interface RichTextEditorRef {
  insertImage: (url: string, width?: string) => void;
  getHTML: () => string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ content, onChange }, ref) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [containerDialogOpen, setContainerDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [twoColumnDialogOpen, setTwoColumnDialogOpen] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableBgColor, setTableBgColor] = useState("#ffffff");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonColor, setButtonColor] = useState("#f97316");
  const [statsTitle, setStatsTitle] = useState("By the Numbers");
  const [statsItems, setStatsItems] = useState<StatItem[]>([
    { value: '100', label: 'Metric 1', color: '#f97316' },
    { value: '50', label: 'Metric 2', color: '#22c55e' },
    { value: '25', label: 'Metric 3', color: '#3b82f6' },
    { value: '10', label: 'Metric 4', color: '#8b5cf6' },
  ]);
  const [statsBgColor, setStatsBgColor] = useState("#1f2937");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [isRecropping, setIsRecropping] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [isTableSelected, setIsTableSelected] = useState(false);
  const [isStyledBoxSelected, setIsStyledBoxSelected] = useState(false);
  const [editBoxStyleDialogOpen, setEditBoxStyleDialogOpen] = useState(false);
  const [activeStyledBoxPos, setActiveStyledBoxPos] = useState<number | null>(null);
  const [addBoxSelectedStyle, setAddBoxSelectedStyle] = useState<StyledBoxStyle>('warm-cream');
  const [addBoxSelectedWidth, setAddBoxSelectedWidth] = useState<StyledBoxWidth>('full');
  
  // Track if this is the initial content load to prevent auto-reserializing
  const isInitialLoad = useRef(true);
  const initialContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'min-h-[1.5em]',
          },
        },
      }),
      ResizableImage,
      Youtube,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // IMPORTANT: TwoColumn MUST come before Table so parseHTML matches data-two-column first
      TwoColumn,
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: element => element.getAttribute('style'),
              renderHTML: attributes => {
                if (!attributes.style) return {};
                return { style: attributes.style };
              },
            },
          };
        },
      }).configure({
        resizable: true,
        HTMLAttributes: {
          class: 'newsletter-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Start typing your newsletter content here... Use the toolbar above to format text, add images, videos, and links.',
      }),
      StyledBox,
      CTAButton,
      StatsBlock,
    ],
    content,
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Skip the first update triggered by initial content parse
      // This prevents TipTap from rewriting/normalizing the original HTML
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      setIsImageSelected(editor.isActive('image'));
      setIsTableSelected(editor.isActive('table'));
      setIsStyledBoxSelected(editor.isActive('styledBox'));
    },
  });

  const getActiveStyledBoxPos = (): number | null => {
    if (!editor) return null;
    const { selection } = editor.state;
    const $from = selection.$from;

    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'styledBox') {
        return $from.before(d);
      }
    }
    return null;
  };

  // Update editor content when content prop changes (template reopen)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Reset isInitialLoad to prevent immediate re-serialization after setContent
      isInitialLoad.current = true;
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      setIsImageSelected(editor.isActive('image'));
      setIsTableSelected(editor.isActive('table'));
      setIsStyledBoxSelected(editor.isActive('styledBox'));
    }
  }, [editor]);

  useImperativeHandle(ref, () => ({
    insertImage: (url: string, width = '200px') => {
      if (editor) {
        const imgHtml = `<img src="${url}" alt="Logo" style="width: ${width}; height: auto; display: block; margin-left: auto; margin-right: auto;" />`;
        editor.chain().focus().insertContent(imgHtml).run();
      }
    },
    // IMPORTANT: Used by parent dialogs to save the *latest* content synchronously.
    // This avoids race conditions where the user clicks Save immediately after a change
    // (e.g., toggling styled-box width) before React state updates.
    getHTML: () => {
      return editor?.getHTML() ?? content ?? "";
    },
  }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setImageDialogOpen(false);
      setIsRecropping(false);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRecropImage = () => {
    if (!editor) return;
    
    const { src } = editor.getAttributes('image');
    if (src) {
      setImageToCrop(src);
      setIsRecropping(true);
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!editor) return;

    setUploading(true);
    try {
      const fileExt = imageFile?.name.split(".").pop() || "jpg";
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `newsletter-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      if (isRecropping) {
        // Update existing image
        editor.chain().focus().updateAttributes('image', { src: publicUrl }).run();
      } else {
        // Insert new image
        editor.chain().focus().setImage({ src: publicUrl }).run();
        setTimeout(() => {
          editor.chain().focus().updateAttributes('image', { width: '600px' }).run();
        }, 0);
      }
      
      setCropDialogOpen(false);
      setImageFile(null);
      setImageToCrop("");
      setIsRecropping(false);
      toast.success(isRecropping ? "Image re-cropped successfully" : "Image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = () => {
    if (!editor || !linkUrl) return;

    if (linkText) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${linkUrl}">${linkText}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }

    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
  };

  const handleAddYoutube = () => {
    if (!editor || !youtubeUrl) return;

    editor.commands.setYoutubeVideo({
      src: youtubeUrl,
      width: 640,
      height: 360,
    });

    setYoutubeDialogOpen(false);
    setYoutubeUrl("");
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !editor) return;

    setUploading(true);
    try {
      const fileExt = videoFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `newsletter-videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, videoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      editor
        .chain()
        .focus()
        .insertContent(`<video controls width="640"><source src="${publicUrl}" type="video/${fileExt}"></video>`)
        .run();
      
      setVideoDialogOpen(false);
      setVideoFile(null);
      toast.success("Video uploaded successfully");
      toast.info("Note: Most email clients don't support embedded videos. Consider using YouTube or a linked thumbnail.", { duration: 5000 });
    } catch (error: any) {
      toast.error("Failed to upload video: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  const updateImageWidth = (width: string) => {
    if (isImageSelected && width) {
      editor.chain().focus().updateAttributes('image', { width }).run();
    }
  };

  const updateImageAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (isImageSelected) {
      const styles = {
        left: 'display: block; margin-left: 0; margin-right: auto;',
        center: 'display: block; margin-left: auto; margin-right: auto;',
        right: 'display: block; margin-left: auto; margin-right: 0;',
      };
      
      // Get current image attributes to preserve them
      const currentAttrs = editor.getAttributes('image');
      
      editor
        .chain()
        .focus()
        .updateAttributes('image', { 
          ...currentAttrs,
          style: styles[alignment] 
        })
        .run();
      
      // Force re-render of selection state
      setTimeout(() => {
        setIsImageSelected(editor.isActive('image'));
      }, 0);
    }
  };

  const imageSizePresets = [
    { label: 'XS', value: '100px' },
    { label: 'S', value: '200px' },
    { label: 'M', value: '300px' },
    { label: 'L', value: '400px' },
    { label: 'XL', value: '500px' },
    { label: 'Full', value: '100%' },
  ];

  return (
    <div className="border rounded-md">
      {isImageSelected && editor && (
        <div className="bg-muted/90 border-b p-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">Image size:</span>
          <div className="flex items-center gap-1">
            {imageSizePresets.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateImageWidth(preset.value)}
                className="h-7 px-3 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="w-px h-6 bg-border mx-2" />
          <span className="text-xs text-muted-foreground mr-2">Align:</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateImageAlignment('left')}
              title="Align left"
              className="h-7"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateImageAlignment('center')}
              title="Align center"
              className="h-7"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateImageAlignment('right')}
              title="Align right"
              className="h-7"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRecropImage}
            title="Re-crop image"
            className="h-7"
          >
            <Crop className="h-4 w-4 mr-1" />
            Re-crop
          </Button>
        </div>
      )}
      {isTableSelected && editor && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 p-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 mr-2">📊 Table:</span>
          
          {/* Row controls */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Rows:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              title="Add row above"
              className="h-7 px-2"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add row below"
              className="h-7 px-2"
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete row"
              className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <RowsIcon className="h-3 w-3 mr-1" />
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Column controls */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Cols:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              title="Add column left"
              className="h-7 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add column right"
              className="h-7 px-2"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete column"
              className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <ColumnsIcon className="h-3 w-3 mr-1" />
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Table actions */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              title="Toggle header row"
              className="h-7 px-2"
            >
              Header
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().mergeCells().run()}
              title="Merge selected cells"
              className="h-7 px-2"
            >
              Merge
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().splitCell().run()}
              title="Split merged cell"
              className="h-7 px-2"
            >
              Split
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Background color picker with presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Background:</span>
            {/* Preset color swatches */}
            <div className="flex gap-1">
              {[
                { color: 'transparent', label: 'None', display: 'bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_2px,transparent_2px,transparent_6px)]' },
                { color: '#ffffff', label: 'White' },
                { color: '#f3f4f6', label: 'Light Gray' },
                { color: '#1f2937', label: 'Dark' },
                { color: '#faf5ef', label: 'Cream' },
                { color: '#e8650d', label: 'Orange' },
                { color: '#22c55e', label: 'Green' },
                { color: '#3b82f6', label: 'Blue' },
              ].map(({ color, label, display }) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded border-2 ${display || ''}`}
                  style={!display ? { backgroundColor: color, borderColor: '#e5e7eb' } : { borderColor: '#e5e7eb' }}
                  onClick={() => {
                    const { state } = editor;
                    const { selection } = state;
                    const $from = selection.$from;
                    
                    for (let d = $from.depth; d >= 0; d--) {
                      const node = $from.node(d);
                      if (node.type.name === 'table') {
                        const pos = $from.before(d);
                        editor.commands.command(({ tr, dispatch }) => {
                          const currentStyle = (node.attrs.style || '')
                            .replace(/background-color:\s*[^;]+;?/gi, '')
                            .trim();
                          const bgStyle = color === 'transparent' || color === '#ffffff' ? '' : `background-color: ${color};`;
                          const finalStyle = [currentStyle, bgStyle].filter(Boolean).join(' ');
                          tr.setNodeMarkup(pos, node.type, { ...node.attrs, style: finalStyle || null }, node.marks);
                          if (dispatch) dispatch(tr);
                          return true;
                        });
                        break;
                      }
                    }
                  }}
                  title={label}
                />
              ))}
            </div>
            {/* Custom color picker */}
            <div className="relative">
              <input
                type="color"
                className="w-6 h-6 rounded border cursor-pointer"
                defaultValue="#ffffff"
                onChange={(e) => {
                  const color = e.target.value;
                  const { state } = editor;
                  const { selection } = state;
                  const $from = selection.$from;
                  
                  for (let d = $from.depth; d >= 0; d--) {
                    const node = $from.node(d);
                    if (node.type.name === 'table') {
                      const pos = $from.before(d);
                      editor.commands.command(({ tr, dispatch }) => {
                        const currentStyle = (node.attrs.style || '')
                          .replace(/background-color:\s*[^;]+;?/gi, '')
                          .trim();
                        const bgStyle = `background-color: ${color};`;
                        const finalStyle = [currentStyle, bgStyle].filter(Boolean).join(' ');
                        tr.setNodeMarkup(pos, node.type, { ...node.attrs, style: finalStyle || null }, node.marks);
                        if (dispatch) dispatch(tr);
                        return true;
                      });
                      break;
                    }
                  }
                }}
                title="Custom color"
              />
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Delete table */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              toast.success("Table deleted");
            }}
            title="Delete entire table"
            className="h-7 px-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete Table
          </Button>
        </div>
      )}
      {isStyledBoxSelected && editor && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 p-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-orange-700 dark:text-orange-300 mr-2">
            <Square className="h-3 w-3 inline mr-1" />
            Styled Box:
          </span>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Capture the exact styledBox position BEFORE opening the dialog.
              // When the dialog opens, focus/selection can move, making style updates
              // target the wrong box or do nothing.
              setActiveStyledBoxPos(getActiveStyledBoxPos());
              setEditBoxStyleDialogOpen(true);
            }}
            className="h-7 px-3 gap-1"
          >
            <Palette className="h-3 w-3" />
            Change Color
          </Button>

          {/* Width toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const pos = getActiveStyledBoxPos();
              if (pos == null) return;
              const node = editor.state.doc.nodeAt(pos);
              if (!node || node.type.name !== 'styledBox') return;
              const currentWidth = node.attrs.width || 'full';
              const newWidth = currentWidth === 'full' ? 'fit' : 'full';
              editor.commands.command(({ tr, dispatch }) => {
                const newAttrs = { ...node.attrs, width: newWidth };
                tr.setNodeMarkup(pos, node.type, newAttrs, node.marks);
                if (dispatch) dispatch(tr);
                return true;
              });
              toast.success(`Width: ${newWidth === 'full' ? 'Full' : 'Fit to content'}`);
            }}
            className="h-7 px-3 gap-1"
            title="Toggle between full width and fit-to-content"
          >
            <Maximize2 className="h-3 w-3" />
            Width
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              editor.chain().focus().lift('styledBox').run();
              toast.success("Box removed, content kept!");
            }}
            title="Remove box wrapper (keeps content)"
            className="h-7 px-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove Box
          </Button>
        </div>
      )}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        {isImageSelected && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRecropImage}
              title="Re-crop image"
            >
              <Crop className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-accent" : ""}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "bg-accent" : ""}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-accent" : ""}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-accent" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-accent" : ""}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? "bg-accent" : ""}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? "bg-accent" : ""}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? "bg-accent" : ""}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? "bg-accent" : ""}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLinkDialogOpen(true)}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setImageDialogOpen(true)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setYoutubeDialogOpen(true)}
          title="YouTube video"
        >
          <YoutubeIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setVideoDialogOpen(true)}
          title="Upload video"
        >
          <VideoIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal line"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setContainerDialogOpen(true)}
          title="Styled box"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTwoColumnDialogOpen(true)}
          title="Magazine-style 2-column layout"
        >
          <Columns className="h-4 w-4" />
        </Button>
        {editor.isActive('styledBox') && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              editor.chain().focus().lift('styledBox').run();
              toast.success("Box removed!");
            }}
            title="Remove box wrapper (keeps content)"
          >
            <Square className="h-4 w-4 opacity-50" />
          </Button>
        )}
        <div className="w-px h-6 bg-border mx-1" />
        <div className="flex items-center gap-1">
          <input
            type="color"
            className="w-8 h-8 rounded cursor-pointer border"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            title="Text color"
          />
          <input
            type="color"
            className="w-8 h-8 rounded cursor-pointer border"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            title="Highlight color"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        {/* Font Size Selector */}
        <Select
          value={editor.getAttributes('textStyle').fontSize || ''}
          onValueChange={(value) => {
            if (value) {
              editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[80px] text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12px">12px</SelectItem>
            <SelectItem value="14px">14px</SelectItem>
            <SelectItem value="16px">16px</SelectItem>
            <SelectItem value="18px">18px</SelectItem>
            <SelectItem value="20px">20px</SelectItem>
            <SelectItem value="24px">24px</SelectItem>
            <SelectItem value="28px">28px</SelectItem>
            <SelectItem value="32px">32px</SelectItem>
            <SelectItem value="36px">36px</SelectItem>
            <SelectItem value="48px">48px</SelectItem>
          </SelectContent>
        </Select>
        {/* Text Style Selector */}
        <Select
          value=""
          onValueChange={(value) => {
            if (value === 'normal') {
              editor.chain().focus().setParagraph().run();
            } else if (value === 'h1') {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
            } else if (value === 'h2') {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (value === 'h3') {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Text style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-6 bg-border mx-1" />
        {/* Table Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTableDialogOpen(true)}
          title="Insert table"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        {/* Columns Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setColumnsDialogOpen(true)}
          title="Insert columns"
        >
          <Columns className="h-4 w-4" />
        </Button>
        {/* CTA Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setButtonDialogOpen(true)}
          title="Insert CTA button"
          className="text-xs"
        >
          CTA
        </Button>
        {/* Stats Block */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatsDialogOpen(true)}
          title="Insert stats block (By the Numbers)"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-background overflow-y-auto max-h-[60vh]">
        <EditorContent editor={editor} />
      </div>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-file">Choose Image</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        allowAspectRatioChange={true}
        selectedRatioKey={aspectRatioKey}
        onAspectRatioKeyChange={setAspectRatioKey}
        title={isRecropping ? "Re-crop Image" : "Crop Image"}
        description={isRecropping ? "Adjust the crop area for this image and select aspect ratio" : "Select aspect ratio and adjust the crop area for your newsletter image"}
      />

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text (optional)</Label>
              <Input
                id="link-text"
                placeholder="Click here"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLink} disabled={!linkUrl}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube Dialog */}
      <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embed YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYoutubeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddYoutube} disabled={!youtubeUrl}>
              Embed Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Upload Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-file">Choose Video</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Note: Most email clients don't support embedded videos. Consider using YouTube for better compatibility.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVideoUpload} disabled={!videoFile || uploading}>
              {uploading ? "Uploading..." : "Insert Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Styled Container Dialog - Unified with STYLED_BOX_STYLES */}
      <Dialog open={containerDialogOpen} onOpenChange={setContainerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Insert Styled Box</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a box style and width:
            </p>
            
            {/* Width toggle */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Width:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={addBoxSelectedWidth === 'full' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddBoxSelectedWidth('full')}
                >
                  Full Width
                </Button>
                <Button
                  type="button"
                  variant={addBoxSelectedWidth === 'fit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAddBoxSelectedWidth('fit')}
                >
                  Fit Content
                </Button>
              </div>
            </div>

            {/* Style grid - same as Change Color */}
            <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto">
              {STYLED_BOX_STYLES.map((style) => (
                <Button
                  key={style.key}
                  variant="outline"
                  className={`h-auto p-3 flex flex-col items-center gap-2 hover:ring-2 hover:ring-primary ${addBoxSelectedStyle === style.key ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setAddBoxSelectedStyle(style.key)}
                >
                  <div 
                    className="w-full h-10 rounded flex items-center justify-center text-xs font-bold" 
                    style={{ 
                      backgroundColor: style.isGradient ? undefined : style.bgColor, 
                      background: style.bgStyle || undefined,
                      color: style.text,
                      border: style.border || undefined,
                    }}
                  >
                    {style.isGradient ? '◐' : 'Aa'}
                  </div>
                  <span className="text-xs font-medium">{style.label}</span>
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Select content first to wrap it, or insert an empty box to type in.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContainerDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!editor) return;
                try {
                  editor.chain().focus().setStyledBox(addBoxSelectedStyle, addBoxSelectedWidth).run();
                  toast.success(`${STYLED_BOX_STYLES.find(s => s.key === addBoxSelectedStyle)?.label || 'Styled'} box added!`);
                } catch (error: any) {
                  toast.error("Select content first");
                }
                setContainerDialogOpen(false);
              }}
            >
              Insert Box
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Box Style Dialog */}
      <Dialog
        open={editBoxStyleDialogOpen}
        onOpenChange={(open) => {
          setEditBoxStyleDialogOpen(open);
          if (!open) setActiveStyledBoxPos(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Box Color</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a new color for this styled box:
            </p>
            <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto">
              {STYLED_BOX_STYLES.map((style) => (
                <Button
                  key={style.key}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center gap-2 hover:ring-2 hover:ring-primary"
                  onClick={() => {
                    if (!editor) return;
                    editor.commands.focus();

                    // Prefer the captured node position (most reliable). Fallback to current selection.
                    const targetPos = activeStyledBoxPos ?? getActiveStyledBoxPos();

                    const ok = editor.commands.command(({ tr, state, dispatch }) => {
                      if (targetPos == null) return false;
                      const node = state.doc.nodeAt(targetPos);
                      if (!node || node.type.name !== 'styledBox') return false;

                      // CRITICAL: Pass node.type explicitly to preserve content structure
                      const newAttrs = { ...node.attrs, style: style.key };
                      tr.setNodeMarkup(targetPos, node.type, newAttrs, node.marks);
                      if (dispatch) dispatch(tr);
                      return true;
                    });

                    if (ok) {
                      toast.success(`Changed to ${style.label}!`);
                      setEditBoxStyleDialogOpen(false);
                    } else {
                      toast.error("Couldn't change that box — click inside the box you want to recolor, then try again.");
                    }
                  }}
                >
                  <div 
                    className="w-full h-10 rounded flex items-center justify-center text-xs font-bold" 
                    style={{ 
                      backgroundColor: style.isGradient ? undefined : style.bgColor, 
                      background: style.bgStyle || undefined,
                      color: style.text,
                      border: style.border || undefined,
                    }}
                  >
                    {style.isGradient ? '◐' : 'Aa'}
                  </div>
                  <span className="text-xs font-medium">{style.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBoxStyleDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-rows">Rows</Label>
                <Input
                  id="table-rows"
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 3)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-cols">Columns</Label>
                <Input
                  id="table-cols"
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>
            <div className="bg-muted p-3 rounded text-sm">
              <p className="text-muted-foreground">Preview: {tableRows} rows × {tableCols} columns</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editor) {
                editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
                setTableDialogOpen(false);
                toast.success("Table inserted!");
              }
            }}>
              Insert Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Columns Dialog */}
      <Dialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a column layout for your content:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    const html = `<table style="width: 100%; border-collapse: collapse; border: none;"><tr><td style="width: 50%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Column 1</td><td style="width: 50%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Column 2</td></tr></table>`;
                    editor.chain().focus().insertContent(html).run();
                    setColumnsDialogOpen(false);
                    toast.success("2-column layout inserted!");
                  }
                }}
              >
                <div className="flex gap-1 w-full">
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                </div>
                <span className="text-xs">2 Columns</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    const html = `<table style="width: 100%; border-collapse: collapse; border: none;"><tr><td style="width: 33.33%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Column 1</td><td style="width: 33.33%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Column 2</td><td style="width: 33.33%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Column 3</td></tr></table>`;
                    editor.chain().focus().insertContent(html).run();
                    setColumnsDialogOpen(false);
                    toast.success("3-column layout inserted!");
                  }
                }}
              >
                <div className="flex gap-1 w-full">
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                </div>
                <span className="text-xs">3 Columns</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    const html = `<table style="width: 100%; border-collapse: collapse; border: none;"><tr><td style="width: 30%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Sidebar</td><td style="width: 70%; padding: 10px; vertical-align: top; border: 1px dashed #e5e7eb;">Main Content</td></tr></table>`;
                    editor.chain().focus().insertContent(html).run();
                    setColumnsDialogOpen(false);
                    toast.success("Sidebar layout inserted!");
                  }
                }}
              >
                <div className="flex gap-1 w-full">
                  <div className="w-1/3 h-12 bg-muted rounded"></div>
                  <div className="flex-1 h-12 bg-muted rounded"></div>
                </div>
                <span className="text-xs">Sidebar</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnsDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Two Column Magazine Layout Dialog */}
      <Dialog open={twoColumnDialogOpen} onOpenChange={setTwoColumnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Insert Magazine-Style Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a layout style for your content section:
            </p>
            <div className="grid grid-cols-1 gap-3">
              {/* Text Left, Image Right */}
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().setTwoColumn('text-left-image-right').run();
                    setTwoColumnDialogOpen(false);
                    toast.success("Magazine layout inserted!");
                  }
                }}
              >
                <div className="flex gap-2 w-full">
                  <div className="flex-1 h-16 rounded flex flex-col items-start justify-center p-2" style={{ backgroundColor: '#faf5ef' }}>
                    <div className="w-3/4 h-2 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="w-full h-1.5 rounded mt-1" style={{ backgroundColor: '#d1d5db' }}></div>
                    <div className="w-2/3 h-1.5 rounded mt-0.5" style={{ backgroundColor: '#d1d5db' }}></div>
                  </div>
                  <div className="w-1/3 h-16 rounded" style={{ backgroundColor: '#e8650d' }}></div>
                </div>
                <span className="text-sm font-medium">Text Left + Image Right</span>
              </Button>

              {/* Image Left, Text Right */}
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().setTwoColumn('image-left-text-right').run();
                    setTwoColumnDialogOpen(false);
                    toast.success("Magazine layout inserted!");
                  }
                }}
              >
                <div className="flex gap-2 w-full">
                  <div className="w-1/3 h-16 rounded" style={{ backgroundColor: '#e8650d' }}></div>
                  <div className="flex-1 h-16 rounded flex flex-col items-start justify-center p-2" style={{ backgroundColor: '#faf5ef' }}>
                    <div className="w-3/4 h-2 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="w-full h-1.5 rounded mt-1" style={{ backgroundColor: '#d1d5db' }}></div>
                    <div className="w-2/3 h-1.5 rounded mt-0.5" style={{ backgroundColor: '#d1d5db' }}></div>
                  </div>
                </div>
                <span className="text-sm font-medium">Image Left + Text Right</span>
              </Button>

              {/* Equal Columns */}
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col gap-2"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().setTwoColumn('equal-columns').run();
                    setTwoColumnDialogOpen(false);
                    toast.success("Two-column layout inserted!");
                  }
                }}
              >
                <div className="flex gap-2 w-full">
                  <div className="flex-1 h-16 rounded flex flex-col items-start justify-center p-2" style={{ backgroundColor: '#faf5ef' }}>
                    <div className="w-3/4 h-2 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="w-full h-1.5 rounded mt-1" style={{ backgroundColor: '#d1d5db' }}></div>
                  </div>
                  <div className="flex-1 h-16 rounded flex flex-col items-start justify-center p-2" style={{ backgroundColor: '#faf5ef' }}>
                    <div className="w-3/4 h-2 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="w-full h-1.5 rounded mt-1" style={{ backgroundColor: '#d1d5db' }}></div>
                  </div>
                </div>
                <span className="text-sm font-medium">Equal Text Columns</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> After inserting, edit the content directly in the editor. The layout uses email-safe tables for compatibility.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTwoColumnDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Button/CTA Dialog */}
      <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Button (CTA)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="button-text">Button Text</Label>
              <Input
                id="button-text"
                placeholder="Click Here"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-url">Link URL</Label>
              <Input
                id="button-url"
                placeholder="https://example.com"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-color">Button Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  id="button-color"
                  type="color"
                  value={buttonColor}
                  onChange={(e) => setButtonColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border"
                />
                <div className="flex gap-1">
                  {['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#1f2937'].map(color => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2"
                      style={{ backgroundColor: color, borderColor: buttonColor === color ? '#000' : 'transparent' }}
                      onClick={() => setButtonColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-muted p-4 rounded flex justify-center">
              <a
                href="#"
                style={{
                  backgroundColor: buttonColor,
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  display: 'inline-block',
                }}
              >
                {buttonText || 'Button Preview'}
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setButtonDialogOpen(false);
              setButtonText("");
              setButtonUrl("");
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editor && buttonText && buttonUrl) {
                editor.commands.setCTAButton({
                  text: buttonText,
                  url: buttonUrl,
                  color: buttonColor,
                });
                setButtonDialogOpen(false);
                setButtonText("");
                setButtonUrl("");
                toast.success("Button inserted!");
              } else {
                toast.error("Please fill in button text and URL");
              }
            }}>
              Insert Button
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Block Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Stats Block (By the Numbers)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stats-title">Block Title</Label>
              <Input
                id="stats-title"
                placeholder="December by the Numbers"
                value={statsTitle}
                onChange={(e) => setStatsTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                {[
                  { color: '#1f2937', label: 'Dark' },
                  { color: '#f3f4f6', label: 'Light' },
                  { color: '#e8650d', label: 'Orange' },
                  { color: '#faf5ef', label: 'Cream' },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-12 h-10 rounded border-2 flex items-center justify-center text-xs ${statsBgColor === color ? 'ring-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color, borderColor: statsBgColor === color ? 'hsl(var(--primary))' : '#e5e7eb', color: color === '#1f2937' || color === '#e8650d' ? 'white' : 'black' }}
                    onClick={() => setStatsBgColor(color)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Stats (up to 4)</Label>
              {statsItems.map((stat, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <Input
                    placeholder="100"
                    value={stat.value}
                    onChange={(e) => {
                      const newStats = [...statsItems];
                      newStats[index] = { ...stat, value: e.target.value };
                      setStatsItems(newStats);
                    }}
                  />
                  <Input
                    placeholder="Label"
                    value={stat.label}
                    onChange={(e) => {
                      const newStats = [...statsItems];
                      newStats[index] = { ...stat, label: e.target.value };
                      setStatsItems(newStats);
                    }}
                  />
                  <input
                    type="color"
                    value={stat.color}
                    onChange={(e) => {
                      const newStats = [...statsItems];
                      newStats[index] = { ...stat, color: e.target.value };
                      setStatsItems(newStats);
                    }}
                    className="w-10 h-10 rounded cursor-pointer border"
                    title="Number color"
                  />
                </div>
              ))}
            </div>
            {/* Preview */}
            <div 
              className="p-6 rounded-lg"
              style={{ backgroundColor: statsBgColor }}
            >
              <h3 
                className="text-center font-bold text-lg mb-4"
                style={{ color: statsBgColor === '#1f2937' || statsBgColor === '#e8650d' ? 'white' : '#1f2937' }}
              >
                {statsTitle}
              </h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                {statsItems.map((stat, index) => (
                  <div key={index}>
                    <div className="text-3xl font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div 
                      className="text-sm mt-1"
                      style={{ color: statsBgColor === '#1f2937' || statsBgColor === '#e8650d' ? '#d1d5db' : '#6b7280' }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editor) {
                editor.commands.setStatsBlock({
                  title: statsTitle,
                  stats: statsItems,
                  backgroundColor: statsBgColor,
                  titleColor: statsBgColor === '#1f2937' || statsBgColor === '#e8650d' ? 'white' : '#1f2937',
                });
                setStatsDialogOpen(false);
                toast.success("Stats block inserted!");
              }
            }}>
              Insert Stats Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
