import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SoundConfig } from './InstrumentSlot';
import { cn } from '@/lib/utils';

interface SoundPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSound: (sound: SoundConfig) => void;
  excludeSoundIds?: string[];
}

export const SoundPickerDialog: React.FC<SoundPickerDialogProps> = ({
  open,
  onOpenChange,
  onSelectSound,
  excludeSoundIds = [],
}) => {
  const [sounds, setSounds] = useState<SoundConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadSounds();
    }
  }, [open]);

  const loadSounds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beat_pad_sounds')
        .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setSounds(data || []);
    } catch (error) {
      console.error('Error loading sounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(sounds.map(s => s.sound_type))];

  const filteredSounds = sounds.filter(sound => {
    if (excludeSoundIds.includes(sound.id)) return false;
    if (selectedCategory && sound.sound_type !== selectedCategory) return false;
    if (search && !sound.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (sound: SoundConfig) => {
    onSelectSound(sound);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a Sound</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sounds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {/* Sound grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                {filteredSounds.map(sound => (
                  <button
                    key={sound.id}
                    onClick={() => handleSelect(sound)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border",
                      "hover:border-primary hover:bg-accent transition-all",
                      "active:scale-95"
                    )}
                  >
                    <span className="text-3xl">{sound.emoji}</span>
                    <span className="text-sm font-medium text-center truncate w-full">
                      {sound.name}
                    </span>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{ backgroundColor: sound.color }}
                    />
                  </button>
                ))}
              </div>
              {filteredSounds.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No sounds found
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SoundPickerDialog;
