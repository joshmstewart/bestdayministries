import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Music, Plus, Edit, Eye, EyeOff, Trash2, Play, Sparkles, Loader2, Upload, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];

const USER_ROLES = [
  { value: "supporter" as UserRole, label: "Supporter" },
  { value: "bestie" as UserRole, label: "Bestie" },
  { value: "caregiver" as UserRole, label: "Caregiver" },
  { value: "admin" as UserRole, label: "Admin" },
  { value: "owner" as UserRole, label: "Owner" },
];

const OSCILLATOR_TYPES = ['sine', 'square', 'triangle', 'sawtooth'];

// Default sound prompts for AI generation
const DEFAULT_SOUND_PROMPTS: Record<string, string> = {
  kick: "Deep punchy kick drum hit, electronic music, 808 style bass drum",
  snare: "Crisp snare drum hit with tight snap, electronic music production",
  hihat: "Closed hi-hat cymbal hit, crisp and short, electronic music",
  bass: "Deep bass synth hit, short punchy low frequency tone",
  synth1: "Short synth stab, electronic lead sound, bright and punchy",
  synth2: "Warm pad synth hit, melodic tone, electronic music",
  bell: "Bell chime sound, clear metallic tone, musical percussion",
  clap: "Hand clap sound, tight and punchy, electronic music style",
};

interface BeatPadSound {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  color: string;
  sound_type: string;
  oscillator_type: string | null;
  frequency: number | null;
  decay: number | null;
  has_noise: boolean | null;
  price_coins: number;
  is_active: boolean | null;
  is_default: boolean | null;
  display_order: number | null;
  visible_to_roles: UserRole[] | null;
  audio_url: string | null;
}

export const BeatPadSoundsManager = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<BeatPadSound | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [generatingSound, setGeneratingSound] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    emoji: "🎵",
    description: "",
    color: "hsl(var(--primary))",
    oscillator_type: "sine",
    frequency: "440",
    decay: "0.2",
    has_noise: false,
    price_coins: "100",
    visible_to_roles: ["supporter", "bestie", "caregiver", "admin", "owner"] as UserRole[],
  });

  const { data: sounds, refetch } = useQuery({
    queryKey: ['beat-pad-sounds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beat_pad_sounds')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as BeatPadSound[];
    },
  });

  const getAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  };

  const previewSound = async (sound: BeatPadSound) => {
    // Stop any existing preview
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }

    // If there's an audio URL, play that
    if (sound.audio_url) {
      try {
        const audio = new Audio(sound.audio_url);
        audio.volume = 0.7;
        setPreviewAudio(audio);
        await audio.play();
        return;
      } catch (error) {
        console.warn('Failed to play audio URL, falling back to synthesis:', error);
      }
    }

    // Fallback to synthesized preview
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = (sound.oscillator_type || 'sine') as OscillatorType;
    osc.frequency.setValueAtTime(sound.frequency || 440, now);
    
    // Pitch envelope for kick-like sounds
    if ((sound.frequency || 440) < 100) {
      osc.frequency.exponentialRampToValueAtTime(30, now + (sound.decay || 0.2));
    }
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (sound.decay || 0.2));
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + (sound.decay || 0.2));
    
    // Add noise if needed
    if (sound.has_noise) {
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      noise.buffer = buffer;
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + (sound.decay || 0.1));
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      noise.stop(now + (sound.decay || 0.1));
    }
  };

  const generateAISound = async (sound: BeatPadSound) => {
    setGeneratingSound(sound.id);
    
    try {
      // Get the appropriate prompt for this sound type
      const prompt = DEFAULT_SOUND_PROMPTS[sound.sound_type] || 
        `${sound.name} sound effect, short percussive hit, electronic music production`;
      
      toast({ title: "Generating AI sound...", description: `Creating ${sound.name} with ElevenLabs` });
      
      // Call the ElevenLabs SFX edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            duration: 1, // Short duration for beat pad sounds
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate sound: ${response.status}`);
      }

      // Get the audio blob
      const audioBlob = await response.blob();
      
      // Upload to Supabase storage
      const fileName = `beat-pad-sounds/${sound.sound_type}-${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-clips')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-clips')
        .getPublicUrl(fileName);

      // Update the sound record with the audio URL
      const { error: updateError } = await supabase
        .from('beat_pad_sounds')
        .update({ audio_url: publicUrl })
        .eq('id', sound.id);

      if (updateError) throw updateError;

      toast({ title: "Sound generated!", description: `${sound.name} now uses AI-generated audio` });
      refetch();
      
      // Preview the new sound - create blob URL for immediate playback
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = 0.7;
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Error generating AI sound:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate sound",
        variant: "destructive",
      });
    } finally {
      setGeneratingSound(null);
    }
  };

  const generateAllAISounds = async () => {
    const defaultSounds = sounds?.filter(s => s.is_default) || [];
    
    if (defaultSounds.length === 0) {
      toast({ title: "No default sounds to generate", variant: "destructive" });
      return;
    }

    toast({ 
      title: "Generating all default sounds...", 
      description: `This will generate ${defaultSounds.length} sounds with AI` 
    });

    for (const sound of defaultSounds) {
      await generateAISound(sound);
      // Small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast({ title: "All sounds generated!", description: "Default sounds now use AI audio" });
  };

  const clearAudioUrl = async (sound: BeatPadSound) => {
    try {
      const { error } = await supabase
        .from('beat_pad_sounds')
        .update({ audio_url: null })
        .eq('id', sound.id);

      if (error) throw error;
      
      toast({ title: "Audio cleared", description: `${sound.name} will use synthesized sound` });
      refetch();
    } catch (error) {
      console.error('Error clearing audio:', error);
      toast({ title: "Error", description: "Failed to clear audio", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const soundData = {
        name: formData.name,
        emoji: formData.emoji,
        description: formData.description || null,
        color: formData.color,
        sound_type: 'oscillator',
        oscillator_type: formData.oscillator_type,
        frequency: parseFloat(formData.frequency),
        decay: parseFloat(formData.decay),
        has_noise: formData.has_noise,
        price_coins: parseInt(formData.price_coins),
        visible_to_roles: formData.visible_to_roles,
      };

      if (editingSound) {
        const { error } = await supabase
          .from('beat_pad_sounds')
          .update(soundData)
          .eq('id', editingSound.id);

        if (error) throw error;
        toast({ title: "Sound updated successfully" });
      } else {
        const { error } = await supabase
          .from('beat_pad_sounds')
          .insert(soundData);

        if (error) throw error;
        toast({ title: "Sound created successfully" });
      }

      resetForm();
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving sound:', error);
      toast({
        title: "Error",
        description: "Failed to save sound",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      emoji: "🎵",
      description: "",
      color: "hsl(var(--primary))",
      oscillator_type: "sine",
      frequency: "440",
      decay: "0.2",
      has_noise: false,
      price_coins: "100",
      visible_to_roles: ["supporter", "bestie", "caregiver", "admin", "owner"] as UserRole[],
    });
    setEditingSound(null);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('beat_pad_sounds')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast({ title: `Sound ${!isActive ? 'activated' : 'deactivated'}` });
      refetch();
    } catch (error) {
      console.error('Error toggling sound:', error);
      toast({
        title: "Error",
        description: "Failed to update sound status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sound?')) return;

    try {
      const { error } = await supabase
        .from('beat_pad_sounds')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sound deleted successfully" });
      refetch();
    } catch (error) {
      console.error('Error deleting sound:', error);
      toast({
        title: "Error",
        description: "Failed to delete sound",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (sound: BeatPadSound) => {
    setEditingSound(sound);
    setFormData({
      name: sound.name,
      emoji: sound.emoji,
      description: sound.description || "",
      color: sound.color,
      oscillator_type: sound.oscillator_type || "sine",
      frequency: String(sound.frequency || 440),
      decay: String(sound.decay || 0.2),
      has_noise: sound.has_noise || false,
      price_coins: String(sound.price_coins),
      visible_to_roles: sound.visible_to_roles || ["supporter", "bestie", "caregiver", "admin", "owner"] as UserRole[],
    });
    setIsDialogOpen(true);
  };

  const defaultSoundsWithAI = sounds?.filter(s => s.is_default && s.audio_url).length || 0;
  const totalDefaultSounds = sounds?.filter(s => s.is_default).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Beat Pad Sounds
            </CardTitle>
            <CardDescription>
              Manage sounds available in the Beat Pad game
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={generateAllAISounds}
              disabled={generatingSound !== null}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate All AI Sounds
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sound
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSound ? 'Edit' : 'Add'} Beat Pad Sound</DialogTitle>
                  <DialogDescription>
                    Configure a sound for the Beat Pad
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="emoji">Emoji *</Label>
                      <Input
                        id="emoji"
                        value={formData.emoji}
                        onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                        required
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="color">Color (HSL)</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price (Coins)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        value={formData.price_coins}
                        onChange={(e) => setFormData({ ...formData, price_coins: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="oscillator">Oscillator Type</Label>
                      <Select value={formData.oscillator_type} onValueChange={(value) => setFormData({ ...formData, oscillator_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OSCILLATOR_TYPES.map(type => (
                            <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency (Hz)</Label>
                      <Input
                        id="frequency"
                        type="number"
                        min="20"
                        max="2000"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="decay">Decay (seconds)</Label>
                      <Input
                        id="decay"
                        type="number"
                        min="0.01"
                        max="2"
                        step="0.01"
                        value={formData.decay}
                        onChange={(e) => setFormData({ ...formData, decay: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox
                        id="has_noise"
                        checked={formData.has_noise}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_noise: checked === true })}
                      />
                      <label htmlFor="has_noise" className="text-sm font-medium">Add Noise Layer</label>
                    </div>
                  </div>

                  <div>
                    <Label>Visible to Roles</Label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {USER_ROLES.map((role) => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role.value}`}
                            checked={formData.visible_to_roles?.includes(role.value)}
                            onCheckedChange={(checked) => {
                              const currentRoles = formData.visible_to_roles || [];
                              const newRoles = checked
                                ? [...currentRoles, role.value]
                                : currentRoles.filter(r => r !== role.value);
                              setFormData({ ...formData, visible_to_roles: newRoles });
                            }}
                          />
                          <label htmlFor={`role-${role.value}`} className="text-sm capitalize">
                            {role.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    {editingSound ? 'Update' : 'Create'} Sound
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* AI Generation Status */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Generated Sounds
              </h4>
              <p className="text-sm text-muted-foreground">
                {defaultSoundsWithAI}/{totalDefaultSounds} default sounds using AI audio
              </p>
            </div>
            <Badge variant={defaultSoundsWithAI === totalDefaultSounds ? "default" : "secondary"}>
              {defaultSoundsWithAI === totalDefaultSounds ? "All AI" : "Mixed"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sound</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Audio</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sounds?.map((sound) => (
              <TableRow key={sound.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sound.emoji}</span>
                    <div>
                      <span className="font-medium">{sound.name}</span>
                      {sound.is_default && (
                        <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {sound.oscillator_type} · {sound.frequency}Hz
                </TableCell>
                <TableCell>
                  {sound.audio_url ? (
                    <Badge variant="default" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  ) : (
                    <Badge variant="outline">Synth</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {sound.price_coins === 0 ? (
                    <Badge variant="outline">Free</Badge>
                  ) : (
                    <span>{sound.price_coins} coins</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${sound.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {sound.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => previewSound(sound)}
                    title="Preview sound"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generateAISound(sound)}
                    disabled={generatingSound === sound.id}
                    title="Generate AI sound"
                  >
                    {generatingSound === sound.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  {sound.audio_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => clearAudioUrl(sound)}
                      title="Clear AI audio (use synth)"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(sound)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(sound.id, sound.is_active ?? true)}
                  >
                    {sound.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {!sound.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(sound.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
