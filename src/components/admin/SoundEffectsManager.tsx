import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Volume2, Play } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

interface SoundEffect {
  id: string;
  event_type: string;
  audio_clip_id: string | null;
  is_enabled: boolean;
  volume: number;
  audio_clips?: {
    id: string;
    title: string;
    file_url: string;
  };
}

interface AudioClip {
  id: string;
  title: string;
  file_url: string;
}

const EVENT_LABELS: Record<string, string> = {
  notification: "Notification Received",
  sticker_pack_reveal: "Sticker Pack Revealed",
  sticker_reveal_common: "Sticker Revealed (Common)",
  sticker_reveal_uncommon: "Sticker Revealed (Uncommon)",
  sticker_reveal_rare: "Sticker Revealed (Rare)",
  sticker_reveal_epic: "Sticker Revealed (Epic)",
  sticker_reveal_legendary: "Sticker Revealed (Legendary)",
  login: "User Login",
  logout: "User Logout",
  message_sent: "Message Sent",
  message_received: "Message Received",
  level_up: "Level Up",
  achievement: "Achievement Unlocked",
  error: "Error Occurred",
  success: "Success Action",
  button_click: "Button Click",
  wheel_click: "Wheel Spin Click",
};

export const SoundEffectsManager = () => {
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [effectsRes, clipsRes] = await Promise.all([
        supabase
          .from("app_sound_effects")
          .select("*, audio_clips(id, title, file_url)")
          .order("event_type"),
        supabase
          .from("audio_clips")
          .select("id, title, file_url")
          .eq("is_active", true)
          .order("title"),
      ]);

      if (effectsRes.error) throw effectsRes.error;
      if (clipsRes.error) throw clipsRes.error;

      setSoundEffects(effectsRes.data || []);
      setAudioClips(clipsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSoundEffect = async (
    id: string,
    updates: Partial<SoundEffect>
  ) => {
    try {
      const { error } = await supabase
        .from("app_sound_effects")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      fetchData();
      toast({ title: "Sound effect updated" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const playPreview = (fileUrl: string, volume: number) => {
    const audio = new Audio(fileUrl);
    audio.volume = volume;
    audio.play();
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sound Effects</h2>
        <p className="text-muted-foreground">
          Assign audio clips to different app events
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Audio Clip</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {soundEffects.map((effect) => (
              <TableRow key={effect.id}>
                <TableCell className="font-medium">
                  {EVENT_LABELS[effect.event_type] || effect.event_type}
                </TableCell>
                <TableCell>
                  <Select
                    value={effect.audio_clip_id || "none"}
                    onValueChange={(value) =>
                      updateSoundEffect(effect.id, {
                        audio_clip_id: value === "none" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select audio clip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {audioClips.map((clip) => (
                        <SelectItem key={clip.id} value={clip.id}>
                          {clip.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 w-[150px]">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Slider
                      value={[effect.volume * 100]}
                      onValueChange={([value]) =>
                        updateSoundEffect(effect.id, {
                          volume: value / 100,
                        })
                      }
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">
                      {Math.round(effect.volume * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={effect.is_enabled}
                    onCheckedChange={(checked) =>
                      updateSoundEffect(effect.id, { is_enabled: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  {effect.audio_clip_id && effect.audio_clips && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        playPreview(
                          effect.audio_clips!.file_url,
                          effect.volume
                        )
                      }
                      title="Preview sound"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        <p className="font-medium mb-2">Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Upload audio clips in the Media → Audio tab first</li>
          <li>Use short clips (under 2 seconds) for best UX</li>
          <li>Keep volume around 50% to avoid being too loud</li>
          <li>Test sounds with the preview button before enabling</li>
        </ul>
      </div>
    </div>
  );
};
