import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, Save, Trash2, Star, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToastWithCopy } from '@/lib/errorToast';
import { SoundConfig } from './InstrumentSlot';

interface Preset {
  id: string;
  name: string;
  instrument_ids: string[];
  is_default: boolean;
  created_at: string;
}

interface PresetManagerProps {
  userId: string | null;
  currentInstruments: (SoundConfig | null)[];
  onLoadPreset: (instrumentIds: string[]) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  userId,
  currentInstruments,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPresets();
    }
  }, [userId]);

  const loadPresets = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('beat_pad_presets')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!userId || !presetName.trim()) {
      showErrorToastWithCopy('Save Preset', 'Please enter a name for your preset');
      return;
    }

    const activeInstrumentIds = currentInstruments
      .filter((i): i is SoundConfig => i !== null)
      .map(i => i.id);

    if (activeInstrumentIds.length === 0) {
      showErrorToastWithCopy('Save Preset', 'Add some instruments first!');
      return;
    }

    setIsSaving(true);
    try {
      // If setting as default, first unset any existing default
      if (setAsDefault) {
        await supabase
          .from('beat_pad_presets')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      const { error } = await supabase
        .from('beat_pad_presets')
        .insert({
          user_id: userId,
          name: presetName.trim(),
          instrument_ids: activeInstrumentIds,
          is_default: setAsDefault,
        });

      if (error) throw error;

      toast.success('Preset saved! 🎹');
      setSaveDialogOpen(false);
      setPresetName('');
      setSetAsDefault(false);
      loadPresets();
    } catch (error) {
      console.error('Error saving preset:', error);
      showErrorToastWithCopy('Save Preset', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (preset: Preset) => {
    onLoadPreset(preset.instrument_ids);
    toast.success(`Loaded "${preset.name}" preset`);
  };

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    if (!confirm(`Delete preset "${presetName}"?`)) return;

    try {
      const { error } = await supabase
        .from('beat_pad_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      toast.success('Preset deleted');
      loadPresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      showErrorToastWithCopy('Delete Preset', error);
    }
  };

  const handleSetDefault = async (presetId: string) => {
    if (!userId) return;

    try {
      // First unset all defaults
      await supabase
        .from('beat_pad_presets')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the new default
      const { error } = await supabase
        .from('beat_pad_presets')
        .update({ is_default: true })
        .eq('id', presetId);

      if (error) throw error;

      toast.success('Default preset updated');
      loadPresets();
    } catch (error) {
      console.error('Error setting default:', error);
      showErrorToastWithCopy('Set Default', error);
    }
  };

  if (!userId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Presets
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Current as Preset
          </DropdownMenuItem>
          
          {presets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Your Presets
              </div>
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="group flex items-center justify-between"
                  onClick={() => handleLoadPreset(preset)}
                >
                  <span className="flex items-center gap-2">
                    {preset.is_default && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="truncate max-w-[120px]">{preset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({preset.instrument_ids.length})
                    </span>
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!preset.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(preset.id);
                        }}
                        title="Set as default"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id, preset.name);
                      }}
                      title="Delete preset"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {isLoading && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading...
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Instrument Preset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName">Preset Name</Label>
              <Input
                id="presetName"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="My awesome preset..."
                maxLength={50}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="setDefault"
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked === true)}
              />
              <Label htmlFor="setDefault" className="text-sm font-normal cursor-pointer">
                Use as default for new beats
              </Label>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">
                Instruments to save ({currentInstruments.filter(Boolean).length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {currentInstruments.filter(Boolean).map((sound, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                  >
                    {sound!.emoji} {sound!.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreset}
              disabled={isSaving || !presetName.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PresetManager;
