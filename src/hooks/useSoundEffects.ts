import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SoundEffect {
  event_type: string;
  audio_clip_id: string | null;
  is_enabled: boolean;
  volume: number;
  file_url?: string;
}

export type SoundEventType =
  | "notification"
  | "sticker_pack_reveal"
  | "sticker_reveal_common"
  | "sticker_reveal_uncommon"
  | "sticker_reveal_rare"
  | "sticker_reveal_epic"
  | "sticker_reveal_legendary"
  | "login"
  | "logout"
  | "message_sent"
  | "message_received"
  | "level_up"
  | "achievement"
  | "error"
  | "success"
  | "button_click"
  | "wheel_click";

export function useSoundEffects() {
  const [soundEffects, setSoundEffects] = useState<Record<string, SoundEffect>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSoundEffects();

    // Subscribe to changes
    const channel = supabase
      .channel("sound_effects_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_sound_effects",
        },
        () => {
          loadSoundEffects();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadSoundEffects = async () => {
    try {
      const { data, error } = await supabase
        .from("app_sound_effects")
        .select("*, audio_clips(file_url)");

      if (error) throw error;

      const effectsMap: Record<string, SoundEffect> = {};
      data?.forEach((effect) => {
        effectsMap[effect.event_type] = {
          event_type: effect.event_type,
          audio_clip_id: effect.audio_clip_id,
          is_enabled: effect.is_enabled,
          volume: effect.volume,
          file_url: effect.audio_clips?.file_url,
        };
      });

      setSoundEffects(effectsMap);
    } catch (error) {
      console.error("Error loading sound effects:", error);
    } finally {
      setLoading(false);
    }
  };

  const playSound = (eventType: SoundEventType) => {
    const effect = soundEffects[eventType];
    
    if (!effect || !effect.is_enabled || !effect.file_url) {
      return;
    }

    try {
      const audio = new Audio(effect.file_url);
      audio.volume = effect.volume;
      audio.play().catch(() => {
        // Audio playback failed - user interaction may be required
      });
    } catch {
      // Error creating audio - silently fail
    }
  };

  return { playSound, loading, soundEffects };
}
