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

// Custom Image extension with resize support
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
} from "lucide-react";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageWidth, setImageWidth] = useState<string>("");

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
  });

  const onCropComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("No 2d context");

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      }, "image/jpeg");
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setImageDialogOpen(false);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!croppedAreaPixels || !imageSrc || !editor) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
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

      editor.chain().focus().setImage({ src: publicUrl }).run();
      setTimeout(() => {
        editor.chain().focus().updateAttributes('image', { width: '600px' }).run();
      }, 0);
      
      setCropDialogOpen(false);
      setImageFile(null);
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      toast.success("Image uploaded successfully");
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

  const selectedImage = editor.isActive('image');
  const currentImageWidth = selectedImage ? editor.getAttributes('image').width : '';

  const updateImageWidth = (width: string) => {
    if (selectedImage && width) {
      editor.chain().focus().updateAttributes('image', { width }).run();
    }
  };

  return (
    <div className="border rounded-md">
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1 items-center">
        {selectedImage && (
          <>
            <div className="flex items-center gap-2 px-2 py-1 bg-background rounded border mr-2">
              <Label htmlFor="image-width" className="text-xs whitespace-nowrap">
                Width (px):
              </Label>
              <Input
                id="image-width"
                type="number"
                className="h-7 w-24"
                placeholder="600"
                value={imageWidth || currentImageWidth || ''}
                onChange={(e) => setImageWidth(e.target.value)}
                onBlur={() => {
                  if (imageWidth) {
                    updateImageWidth(imageWidth);
                    setImageWidth('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && imageWidth) {
                    updateImageWidth(imageWidth);
                    setImageWidth('');
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateImageWidth('100%')}
                title="Full width"
              >
                100%
              </Button>
            </div>
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
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-96 bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="space-y-2">
              <Label>Zoom</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropComplete} disabled={uploading}>
              {uploading ? "Uploading..." : "Crop & Insert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
};
