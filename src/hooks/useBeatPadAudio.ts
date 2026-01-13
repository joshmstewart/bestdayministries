import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstrumentConfig {
  type: OscillatorType;
  freq: number;
  decay: number;
  noise?: boolean;
  audioUrl?: string;
}

// Default synthesized fallback sounds (used if no audio_url is set)
const DEFAULT_INSTRUMENTS: Record<string, InstrumentConfig> = {
  kick: { type: 'sine', freq: 60, decay: 0.3 },
  snare: { type: 'triangle', freq: 200, decay: 0.1, noise: true },
  hihat: { type: 'square', freq: 800, decay: 0.05 },
  bass: { type: 'sawtooth', freq: 80, decay: 0.2 },
  synth1: { type: 'square', freq: 220, decay: 0.15 },
  synth2: { type: 'sine', freq: 330, decay: 0.2 },
  bell: { type: 'sine', freq: 523, decay: 0.4 },
  clap: { type: 'triangle', freq: 150, decay: 0.08, noise: true },
};

export type InstrumentType = keyof typeof DEFAULT_INSTRUMENTS;

export const INSTRUMENT_LABELS: Record<InstrumentType, { name: string; emoji: string; color: string }> = {
  kick: { name: 'Kick Drum', emoji: '🥁', color: 'hsl(var(--primary))' },
  snare: { name: 'Snare', emoji: '🪘', color: 'hsl(25, 95%, 53%)' },
  hihat: { name: 'Hi-Hat', emoji: '🎶', color: 'hsl(48, 96%, 53%)' },
  bass: { name: 'Bass', emoji: '🎸', color: 'hsl(280, 87%, 65%)' },
  synth1: { name: 'Synth 1', emoji: '🎹', color: 'hsl(168, 76%, 42%)' },
  synth2: { name: 'Synth 2', emoji: '🎵', color: 'hsl(221, 83%, 53%)' },
  bell: { name: 'Bell', emoji: '🔔', color: 'hsl(340, 82%, 52%)' },
  clap: { name: 'Clap', emoji: '👏', color: 'hsl(142, 71%, 45%)' },
};

// Map sound_type from database to instrument key
const SOUND_TYPE_TO_INSTRUMENT: Record<string, InstrumentType> = {
  kick: 'kick',
  snare: 'snare',
  hihat: 'hihat',
  bass: 'bass',
  synth1: 'synth1',
  synth2: 'synth2',
  bell: 'bell',
  clap: 'clap',
};

export const useBeatPadAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const [instrumentConfigs, setInstrumentConfigs] = useState<Record<string, InstrumentConfig>>(DEFAULT_INSTRUMENTS);
  const [isLoading, setIsLoading] = useState(true);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Load audio buffer from URL
  const loadAudioBuffer = useCallback(async (url: string, key: string): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioContext();
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch audio for ${key}:`, response.status);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBuffersRef.current.set(key, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load audio buffer for ${key}:`, error);
      return null;
    }
  }, [getAudioContext]);

  // Load sound configurations from database
  const loadSoundConfigs = useCallback(async () => {
    try {
      const { data: sounds, error } = await supabase
        .from('beat_pad_sounds')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true);

      if (error) {
        console.error('Error loading beat pad sounds:', error);
        return;
      }

      if (!sounds || sounds.length === 0) {
        console.log('No custom sounds found, using defaults');
        return;
      }

      const newConfigs: Record<string, InstrumentConfig> = { ...DEFAULT_INSTRUMENTS };

      // Load audio buffers for sounds with audio_url
      const loadPromises: Promise<void>[] = [];

      for (const sound of sounds) {
        const instrumentKey = SOUND_TYPE_TO_INSTRUMENT[sound.sound_type];
        if (instrumentKey) {
          // Update config with database values
          newConfigs[instrumentKey] = {
            type: (sound.oscillator_type as OscillatorType) || DEFAULT_INSTRUMENTS[instrumentKey].type,
            freq: sound.frequency || DEFAULT_INSTRUMENTS[instrumentKey].freq,
            decay: sound.decay || DEFAULT_INSTRUMENTS[instrumentKey].decay,
            noise: sound.has_noise || DEFAULT_INSTRUMENTS[instrumentKey].noise,
            audioUrl: sound.audio_url || undefined,
          };

          // Pre-load audio buffer if URL exists
          if (sound.audio_url) {
            loadPromises.push(
              loadAudioBuffer(sound.audio_url, instrumentKey).then(() => {})
            );
          }
        }
      }

      // Wait for all audio buffers to load
      await Promise.all(loadPromises);
      setInstrumentConfigs(newConfigs);
    } catch (error) {
      console.error('Error in loadSoundConfigs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadAudioBuffer]);

  // Initialize sounds on mount
  useEffect(() => {
    loadSoundConfigs();
  }, [loadSoundConfigs]);

  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  // Play audio buffer (for AI-generated sounds)
  const playAudioBuffer = useCallback((buffer: AudioBuffer) => {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  }, [getAudioContext]);

  // Play synthesized sound (fallback)
  const playSynthesizedSound = useCallback((instrument: InstrumentType) => {
    const ctx = getAudioContext();
    const config = instrumentConfigs[instrument] || DEFAULT_INSTRUMENTS[instrument];
    const now = ctx.currentTime;

    // Create oscillator
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = config.type;
    osc.frequency.setValueAtTime(config.freq, now);
    
    // Add pitch envelope for kick
    if (instrument === 'kick') {
      osc.frequency.exponentialRampToValueAtTime(30, now + config.decay);
    }
    
    // Gain envelope
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.decay);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + config.decay);

    // Add noise for snare and clap
    if (config.noise) {
      const noiseBuffer = createNoiseBuffer(ctx);
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      noise.buffer = noiseBuffer;
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + config.decay);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      noise.stop(now + config.decay);
    }
  }, [getAudioContext, createNoiseBuffer, instrumentConfigs]);

  const playSound = useCallback((instrument: InstrumentType) => {
    // Check if we have a pre-loaded audio buffer for this instrument
    const audioBuffer = audioBuffersRef.current.get(instrument);
    
    if (audioBuffer) {
      // Play the AI-generated sound
      playAudioBuffer(audioBuffer);
    } else {
      // Fallback to synthesized sound
      playSynthesizedSound(instrument);
    }
  }, [playAudioBuffer, playSynthesizedSound]);

  // Reload sounds (called after generating new sounds)
  const reloadSounds = useCallback(async () => {
    setIsLoading(true);
    audioBuffersRef.current.clear();
    await loadSoundConfigs();
  }, [loadSoundConfigs]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playSound, getAudioContext, isLoading, reloadSounds };
};

export default useBeatPadAudio;
