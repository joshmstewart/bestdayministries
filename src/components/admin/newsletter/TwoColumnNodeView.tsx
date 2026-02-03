import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Trash2, ArrowLeftRight, Crop, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { compressImage } from '@/lib/imageUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type AspectRatioKey = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

const BACKGROUND_OPTIONS = [
  { label: 'None', value: 'transparent' },
  { label: 'White', value: '#ffffff' },
  { label: 'Cream', value: '#faf5ef' },
  { label: 'Warm Sand', value: '#f5f0e8' },
  { label: 'Soft Peach', value: '#fff4ed' },
  { label: 'Natural Sage', value: '#f5f3ed' },
  { label: 'Wheat', value: '#f8f4e9' },
];

export const TwoColumnNodeView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { layout, leftContent, rightContent, imageUrl, backgroundColor } = node.attrs;
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aspectRatioKey, setAspectRatioKey] = useState<AspectRatioKey>('4:3');
  const [isEditingExistingImage, setIsEditingExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageLeft = layout === 'image-left-text-right';
  const isEqual = layout === 'equal-columns';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    // If editing an existing image (not uploading new), just update the URL
    if (isEditingExistingImage) {
      setUploading(true);
      try {
        const fileName = `${Math.random()}.jpg`;
        const filePath = `newsletter-images/${fileName}`;

        // Compress the cropped image
        const tempFile = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
        const compressedFile = await compressImage(tempFile, 1, 1200, 1200);

        const { error: uploadError } = await supabase.storage
          .from('app-assets')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('app-assets')
          .getPublicUrl(filePath);

        updateAttributes({ imageUrl: publicUrl });
        setCropDialogOpen(false);
        setIsEditingExistingImage(false);
        toast.success('Image updated successfully');
      } catch (error: any) {
        toast.error('Failed to update image: ' + error.message);
      } finally {
        setUploading(false);
      }
      return;
    }

    // Original flow for new image upload
    setUploading(true);
    try {
      const fileExt = imageFile?.name.split('.').pop() || 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `newsletter-images/${fileName}`;

      // Convert blob to file for compression
      const tempFile = new File([croppedBlob], `temp.${fileExt}`, { type: croppedBlob.type });
      
      // Compress image: max 1MB, max 1200px (optimized for email)
      const compressedFile = await compressImage(tempFile, 1, 1200, 1200);

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

      updateAttributes({ imageUrl: publicUrl });
      setCropDialogOpen(false);
      setImageFile(null);
      setImageToCrop('');
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Check if we have a real uploaded image (not placeholder or empty)
  const hasRealImage = imageUrl && imageUrl.length > 0 && !imageUrl.includes('placehold.co');

  const handleEditExistingImage = () => {
    if (hasRealImage) {
      setImageToCrop(imageUrl);
      setIsEditingExistingImage(true);
      setCropDialogOpen(true);
    }
  };

  const handleTextChange = (side: 'left' | 'right', value: string) => {
    if (side === 'left') {
      updateAttributes({ leftContent: value });
    } else {
      updateAttributes({ rightContent: value });
    }
  };

  const toggleLayout = () => {
    if (layout === 'text-left-image-right') {
      updateAttributes({ layout: 'image-left-text-right' });
    } else if (layout === 'image-left-text-right') {
      updateAttributes({ layout: 'text-left-image-right' });
    }
  };

  // For text-only equal columns layout
  if (isEqual) {
    return (
      <NodeViewWrapper className="two-column-node-view">
        <div 
          className="relative rounded-lg p-6 my-4"
          style={{ backgroundColor }}
        >
          {/* Header badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap z-10">
            📰 TWO COLUMNS
          </div>

          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 bg-white/80 hover:bg-accent"
                  title="Change background color"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Background Color</p>
                  {BACKGROUND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateAttributes({ backgroundColor: option.value })}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                        backgroundColor === option.value ? 'bg-accent' : ''
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded border border-border" 
                        style={{ backgroundColor: option.value === 'transparent' ? '#fff' : option.value }}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deleteNode}
              className="h-7 px-2 bg-white/80 hover:bg-destructive hover:text-destructive-foreground"
              title="Remove layout"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Two column grid */}
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Left Column</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={leftContent.replace(/<[^>]*>/g, '')}
                onChange={(e) => handleTextChange('left', e.target.value)}
                placeholder="Enter left column text..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Right Column</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={rightContent.replace(/<[^>]*>/g, '')}
                onChange={(e) => handleTextChange('right', e.target.value)}
                placeholder="Enter right column text..."
              />
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // For image + text layouts
  const textContent = isImageLeft ? rightContent : leftContent;
  const setTextContent = (value: string) => {
    handleTextChange(isImageLeft ? 'right' : 'left', value);
  };

  return (
    <NodeViewWrapper className="two-column-node-view">
      <div 
        className="relative rounded-lg p-6 my-4"
        style={{ backgroundColor }}
      >
        {/* Header badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md whitespace-nowrap z-10">
          📰 MAGAZINE LAYOUT
        </div>

          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 bg-white/80 hover:bg-accent"
                  title="Change background color"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Background Color</p>
                  {BACKGROUND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateAttributes({ backgroundColor: option.value })}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors ${
                        backgroundColor === option.value ? 'bg-accent' : ''
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded border border-border" 
                        style={{ backgroundColor: option.value === 'transparent' ? '#fff' : option.value }}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleLayout}
              className="h-7 px-2 bg-white/80 hover:bg-accent"
              title="Swap image position"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deleteNode}
              className="h-7 px-2 bg-white/80 hover:bg-destructive hover:text-destructive-foreground"
              title="Remove layout"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

        {/* Two column grid */}
        <div className={`grid grid-cols-2 gap-6 mt-4 ${isImageLeft ? '' : 'direction-ltr'}`}>
          {/* Image side */}
          <div className={`${isImageLeft ? 'order-1' : 'order-2'}`}>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Image</label>
            <div 
              className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted/50 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasRealImage ? (
                <img 
                  src={imageUrl} 
                  alt="Layout image" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Click to upload image</span>
                  <span className="text-xs opacity-70">or drag and drop</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {hasRealImage && (
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditExistingImage();
                  }}
                >
                  <Crop className="h-4 w-4 mr-2" />
                  Crop
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Replace
                </Button>
              </div>
            )}
          </div>

          {/* Text side */}
          <div className={`${isImageLeft ? 'order-2' : 'order-1'} space-y-2`}>
            <label className="text-xs font-medium text-muted-foreground">Text Content</label>
            <textarea
              className="w-full min-h-[180px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={textContent.replace(/<[^>]*>/g, '')}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text content here...

Add a headline and description that will appear alongside your image."
            />
            <p className="text-xs text-muted-foreground">
              💡 First line becomes headline. Rest becomes body text.
            </p>
          </div>
        </div>
      </div>

      {/* Image crop dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        allowAspectRatioChange={true}
        selectedRatioKey={aspectRatioKey}
        onAspectRatioKeyChange={setAspectRatioKey}
        title="Crop Image"
        description="Select aspect ratio and adjust the crop area"
      />
    </NodeViewWrapper>
  );
};
