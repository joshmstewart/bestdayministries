import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, GripVertical, Image, Video, Youtube, Eye, EyeOff } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface StoryMedia {
  id: string;
  media_type: 'image' | 'video' | 'youtube';
  media_url: string;
  youtube_url: string | null;
  caption: string | null;
  display_order: number;
  is_active: boolean;
}

interface VendorStoryMediaManagerProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

const SortableMediaItem = ({ 
  media, 
  onToggleActive, 
  onDelete, 
  isDeleting 
}: { 
  media: StoryMedia; 
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
      <button {...attributes} {...listeners} className="cursor-grab hover:text-primary">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {media.media_type === 'image' && (
          <img src={media.media_url} alt={media.caption || ''} className="w-full h-full object-cover" />
        )}
        {media.media_type === 'video' && (
          <video src={media.media_url} className="w-full h-full object-cover" />
        )}
        {media.media_type === 'youtube' && (
          <div className="w-full h-full flex items-center justify-center bg-red-500/10">
            <Youtube className="h-8 w-8 text-red-500" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {media.media_type === 'image' && <Image className="h-4 w-4 text-muted-foreground" />}
          {media.media_type === 'video' && <Video className="h-4 w-4 text-muted-foreground" />}
          {media.media_type === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
          <span className="text-sm font-medium capitalize">{media.media_type}</span>
        </div>
        {media.caption && (
          <p className="text-sm text-muted-foreground truncate">{media.caption}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleActive(media.id, !media.is_active)}
          title={media.is_active ? "Hide from store" : "Show on store"}
        >
          {media.is_active ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(media.id)}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const VendorStoryMediaManager = ({ vendorId, theme }: VendorStoryMediaManagerProps) => {
  const [media, setMedia] = useState<StoryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newMedia, setNewMedia] = useState({
    type: 'image' as 'image' | 'video' | 'youtube',
    file: null as File | null,
    youtubeUrl: '',
    caption: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadMedia();
  }, [vendorId]);

  const loadMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_story_media')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setMedia((data || []).map(item => ({
        ...item,
        media_type: item.media_type as 'image' | 'video' | 'youtube'
      })));
    } catch (error) {
      console.error('Error loading story media:', error);
      toast.error('Failed to load story media');
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddMedia = async () => {
    if (newMedia.type === 'youtube') {
      const videoId = extractYoutubeVideoId(newMedia.youtubeUrl);
      if (!videoId) {
        toast.error('Invalid YouTube URL');
        return;
      }

      setUploading(true);
      try {
        const { error } = await supabase
          .from('vendor_story_media')
          .insert({
            vendor_id: vendorId,
            media_type: 'youtube',
            media_url: `https://www.youtube.com/embed/${videoId}`,
            youtube_url: newMedia.youtubeUrl,
            caption: newMedia.caption || null,
            display_order: media.length
          });

        if (error) throw error;
        toast.success('YouTube video added');
        setDialogOpen(false);
        resetForm();
        loadMedia();
      } catch (error) {
        console.error('Error adding YouTube video:', error);
        toast.error('Failed to add video');
      } finally {
        setUploading(false);
      }
    } else if (newMedia.file) {
      setUploading(true);
      try {
        const file = newMedia.file;
        const isVideo = newMedia.type === 'video';
        const processedFile = isVideo ? file : await compressImage(file, 0.8);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${vendorId}/story-${Date.now()}.${fileExt}`;
        const bucket = isVideo ? 'videos' : 'app-assets';
        const path = isVideo ? `vendor-stories/${fileName}` : `vendors/stories/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, processedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

        const { error } = await supabase
          .from('vendor_story_media')
          .insert({
            vendor_id: vendorId,
            media_type: newMedia.type,
            media_url: publicUrl,
            caption: newMedia.caption || null,
            display_order: media.length
          });

        if (error) throw error;
        toast.success(`${newMedia.type === 'image' ? 'Image' : 'Video'} uploaded`);
        setDialogOpen(false);
        resetForm();
        loadMedia();
      } catch (error) {
        console.error('Error uploading media:', error);
        toast.error('Failed to upload media');
      } finally {
        setUploading(false);
      }
    }
  };

  const resetForm = () => {
    setNewMedia({ type: 'image', file: null, youtubeUrl: '', caption: '' });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('vendor_story_media')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      setMedia(prev => prev.map(m => m.id === id ? { ...m, is_active: isActive } : m));
      toast.success(isActive ? 'Media shown on store' : 'Media hidden from store');
    } catch (error) {
      console.error('Error updating media:', error);
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('vendor_story_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMedia(prev => prev.filter(m => m.id !== id));
      toast.success('Media deleted');
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = media.findIndex(m => m.id === active.id);
    const newIndex = media.findIndex(m => m.id === over.id);
    const reordered = arrayMove(media, oldIndex, newIndex);
    
    setMedia(reordered);

    // Update display orders in DB
    const updates = reordered.map((m, idx) => ({
      id: m.id,
      display_order: idx
    }));

    for (const update of updates) {
      await supabase
        .from('vendor_story_media')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Add photos and videos to tell your story and show yourself creating
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Story Media</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select 
                  value={newMedia.type} 
                  onValueChange={(v) => setNewMedia(prev => ({ ...prev, type: v as any, file: null, youtubeUrl: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Photo
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </div>
                    </SelectItem>
                    <SelectItem value="youtube">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        YouTube
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newMedia.type === 'youtube' ? (
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    value={newMedia.youtubeUrl}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{newMedia.type === 'image' ? 'Photo' : 'Video'}</Label>
                  <Input
                    type="file"
                    accept={newMedia.type === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Caption (optional)</Label>
                <Textarea
                  value={newMedia.caption}
                  onChange={(e) => setNewMedia(prev => ({ ...prev, caption: e.target.value }))}
                  placeholder="Describe this moment..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleAddMedia} 
                disabled={uploading || (newMedia.type !== 'youtube' && !newMedia.file) || (newMedia.type === 'youtube' && !newMedia.youtubeUrl)}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Add Media'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {media.length === 0 ? (
        <Card 
          className="border-2"
          style={theme ? { 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          } : undefined}
        >
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No story media yet. Add photos and videos to show customers who you are!</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={media.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {media.map((item) => (
                <SortableMediaItem
                  key={item.id}
                  media={item}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  isDeleting={deleting === item.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
