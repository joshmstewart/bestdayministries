import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, Save, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SoundConfig } from './InstrumentSlot';

interface SaveBeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern: Record<string, boolean[]>;
  tempo: number;
  instruments: (SoundConfig | null)[];
  userId: string;
  onSaved: () => void;
}

export const SaveBeatDialog: React.FC<SaveBeatDialogProps> = ({
  open,
  onOpenChange,
  pattern,
  tempo,
  instruments,
  userId,
  onSaved,
}) => {
  const [beatName, setBeatName] = useState('');
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateAIName = async () => {
    setIsGeneratingName(true);
    try {
      // Build a description of the beat for AI
      const activeInstruments = instruments.filter(Boolean).map(i => i!.name);
      const totalNotes = Object.values(pattern).reduce((sum, steps) => 
        sum + steps.filter(Boolean).length, 0
      );
      
      const prompt = `Generate a single creative, fun, catchy name (2-4 words max) for a beat that uses these instruments: ${activeInstruments.join(', ')}. The beat has ${totalNotes} notes at ${tempo} BPM. Make it playful and memorable. Just return the name, nothing else.`;

      const response = await supabase.functions.invoke('lovable-ai', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          model: 'google/gemini-2.5-flash-lite',
        },
      });

      if (response.error) throw response.error;
      
      const name = response.data?.content?.trim() || 'My Epic Beat';
      setBeatName(name.replace(/["']/g, '').substring(0, 50));
    } catch (error) {
      console.error('Error generating name:', error);
      toast.error('Could not generate name');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleSave = async (isPublic: boolean) => {
    if (!beatName.trim()) {
      toast.error('Please enter a name for your beat');
      return;
    }

    setIsSaving(true);
    try {
      // Convert pattern to use sound IDs for storage
      const patternWithIds: Record<string, boolean[]> = {};
      instruments.forEach((sound, idx) => {
        if (sound && pattern[idx.toString()]) {
          patternWithIds[sound.id] = pattern[idx.toString()];
        }
      });

      const { data, error } = await supabase
        .from('beat_pad_creations')
        .insert({
          creator_id: userId,
          name: beatName.trim(),
          pattern: patternWithIds,
          tempo,
          is_public: isPublic,
        })
        .select('id')
        .single();

      if (error) throw error;
      
      toast.success(isPublic ? 'Beat shared with community! 🎉' : 'Beat saved!');
      toast.info('Generating cover art...', { duration: 3000 });
      
      // Generate AI image in background
      const instrumentNames = instruments.filter(Boolean).map(i => i!.name);
      supabase.functions.invoke('generate-beat-image', {
        body: {
          beatId: data.id,
          beatName: beatName.trim(),
          instruments: instrumentNames,
          tempo,
          pattern: patternWithIds,
        },
      }).then((res) => {
        if (res.error) {
          console.error('Image generation failed:', res.error);
        } else {
          toast.success('Cover art generated! 🎨');
        }
      }).catch(console.error);
      
      onSaved();
      onOpenChange(false);
      setBeatName('');
    } catch (error) {
      console.error('Error saving beat:', error);
      toast.error('Failed to save beat');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Your Beat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="beatName">Beat Name</Label>
            <div className="flex gap-2">
              <Input
                id="beatName"
                value={beatName}
                onChange={(e) => setBeatName(e.target.value)}
                placeholder="Enter a name for your beat..."
                maxLength={50}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={generateAIName}
                disabled={isGeneratingName}
                title="Generate AI name"
              >
                {isGeneratingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the magic wand to let AI name your beat!
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Tempo:</strong> {tempo} BPM
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Instruments:</strong> {instruments.filter(Boolean).length}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Notes:</strong> {Object.values(pattern).reduce((sum, steps) => 
                sum + steps.filter(Boolean).length, 0
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving || !beatName.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Private
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving || !beatName.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Share to Community
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveBeatDialog;
