import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Trash2, ArrowLeftRight, Crop, Palette, MousePointerClick, Maximize2, Columns } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { compressImage } from '@/lib/imageUtils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type AspectRatioKey = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

const BACKGROUND_OPTIONS = [
  { label: 'None', value: 'transparent' },
  { label: 'White', value: '#ffffff' },
  { label: 'Cream', value: '#faf5ef' },
  { label: 'Warm Sand', value: '#f5f0e8' },
  { label: 'Soft Peach', value: '#fff4ed' },
  { label: 'Natural Sage', value: '#eef3ea' },
  { label: 'Wheat', value: '#f8f4e9' },
];

const CTA_COLOR_PRESETS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444', '#1f2937'];

export const TwoColumnNodeView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const { layout, leftContent, rightContent, imageUrl, backgroundColor, backgroundScope } = node.attrs;
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aspectRatioKey, setAspectRatioKey] = useState<AspectRatioKey>('4:3');
  const [isEditingExistingImage, setIsEditingExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // CTA dialog state
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false);
  const [ctaTargetColumn, setCtaTargetColumn] = useState<'left' | 'right'>('left');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [ctaColor, setCtaColor] = useState('#f97316');

  const isImageLeft = layout === 'image-left-text-right';
  const isEqual = layout === 'equal-columns';
  const isTextOnlyBg = backgroundScope === 'text-only';
  
  // Open CTA dialog for a specific column
  const openCtaDialog = (column: 'left' | 'right') => {
    setCtaTargetColumn(column);
    setCtaText('');
    setCtaUrl('');
    setCtaColor('#f97316');
    setCtaDialogOpen(true);
  };
  
  // Insert CTA marker into the text content
  const insertCta = () => {
    if (!ctaText || !ctaUrl) {
      toast.error('Please fill in button text and URL');
      return;
    }
    
    // Format: [CTA:text|url|color]
    const ctaMarker = `[CTA:${ctaText}|${ctaUrl}|${ctaColor}]`;
    
    if (ctaTargetColumn === 'left') {
      updateAttributes({ leftContent: leftContent + '\n' + ctaMarker });
    } else {
      updateAttributes({ rightContent: rightContent + '\n' + ctaMarker });
    }
    
    setCtaDialogOpen(false);
    toast.success('CTA button added!');
  };

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openCtaDialog('left')}
              >
                <MousePointerClick className="h-4 w-4 mr-2" />
                Add CTA Button
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Right Column</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={rightContent.replace(/<[^>]*>/g, '')}
                onChange={(e) => handleTextChange('right', e.target.value)}
                placeholder="Enter right column text..."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openCtaDialog('right')}
              >
                <MousePointerClick className="h-4 w-4 mr-2" />
                Add CTA Button
              </Button>
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

  // Compute background styles based on scope
  const containerBgColor = isTextOnlyBg ? 'transparent' : backgroundColor;
  const textCellBgColor = isTextOnlyBg ? backgroundColor : 'transparent';
  
  return (
    <NodeViewWrapper className="two-column-node-view">
      <div 
        className="relative rounded-lg p-6 my-4"
        style={{ backgroundColor: containerBgColor }}
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
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Background Color</p>
                    <div className="space-y-1">
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
                  </div>
                  
                  {/* Background scope toggle - only show for image layouts */}
                  {backgroundColor !== 'transparent' && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Background Covers</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateAttributes({ backgroundScope: 'full' })}
                          className={`flex-1 flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors ${
                            !isTextOnlyBg ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-accent border-border'
                          }`}
                        >
                          <Maximize2 className="h-4 w-4" />
                          Full Layout
                        </button>
                        <button
                          onClick={() => updateAttributes({ backgroundScope: 'text-only' })}
                          className={`flex-1 flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors ${
                            isTextOnlyBg ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-accent border-border'
                          }`}
                        >
                          <Columns className="h-4 w-4" />
                          Text Only
                        </button>
                      </div>
                    </div>
                  )}
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
          <div 
            className={`${isImageLeft ? 'order-2' : 'order-1'} space-y-2 rounded-lg ${isTextOnlyBg && textCellBgColor !== 'transparent' ? 'p-4' : ''}`}
            style={{ backgroundColor: textCellBgColor }}
          >
            <label className="text-xs font-medium text-muted-foreground">Text Content</label>
            <textarea
              className="w-full min-h-[180px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={textContent.replace(/<[^>]*>/g, '')}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your text content here...

Add a headline and description that will appear alongside your image."
            />
            <div className="flex gap-2">
              <p className="text-xs text-muted-foreground flex-1">
                💡 First line becomes headline. Rest becomes body text.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCtaDialog(isImageLeft ? 'right' : 'left')}
              >
                <MousePointerClick className="h-4 w-4 mr-2" />
                Add CTA
              </Button>
            </div>
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

      {/* CTA Button dialog */}
      <Dialog open={ctaDialogOpen} onOpenChange={setCtaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add CTA Button</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cta-text">Button Text</Label>
              <Input
                id="cta-text"
                placeholder="Click Here"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-url">Link URL</Label>
              <Input
                id="cta-url"
                placeholder="https://example.com"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Button Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={ctaColor}
                  onChange={(e) => setCtaColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border"
                />
                <div className="flex gap-1">
                  {CTA_COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2"
                      style={{ backgroundColor: color, borderColor: ctaColor === color ? '#000' : 'transparent' }}
                      onClick={() => setCtaColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-muted p-4 rounded flex justify-center">
              <span
                style={{
                  backgroundColor: ctaColor,
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  display: 'inline-block',
                }}
              >
                {ctaText || 'Button Preview'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCtaDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertCta}>
              Add Button
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
};
