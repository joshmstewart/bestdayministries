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
import { forwardRef, useImperativeHandle } from "react";

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
} from "lucide-react";
import { useState } from "react";
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
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ content, onChange }, ref) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage,
      Youtube,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      FontFamily,
      Color,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start typing your newsletter content here... Use the toolbar above to format text, add images, videos, and links.',
      }),
    ],
    content,
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      setIsImageSelected(editor.isActive('image'));
    },
  });

  useEffect(() => {
    if (editor) {
      setIsImageSelected(editor.isActive('image'));
    }
  }, [editor]);

  useImperativeHandle(ref, () => ({
    insertImage: (url: string, width = '200px') => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
        setTimeout(() => {
          editor.chain().focus().updateAttributes('image', { 
            style: `width: ${width}; height: auto; display: block; margin: 0 auto;`
          }).run();
        }, 50);
      }
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
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 items-center">
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

      <div className="bg-background">
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
    </div>
  );
});
