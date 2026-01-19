import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SoundConfig {
  type: OscillatorType;
  freq: number;
  decay: number;
  noise?: boolean;
  audioUrl?: string;
}

const DEFAULT_SOUNDS: Record<string, SoundConfig> = {
  kick: { type: 'sine', freq: 60, decay: 0.3 },
  snare: { type: 'triangle', freq: 200, decay: 0.1, noise: true },
  hihat: { type: 'square', freq: 800, decay: 0.05 },
  bass: { type: 'sawtooth', freq: 80, decay: 0.2 },
  synth1: { type: 'square', freq: 220, decay: 0.15 },
  synth2: { type: 'sine', freq: 330, decay: 0.2 },
  bell: { type: 'sine', freq: 523, decay: 0.4 },
  clap: { type: 'triangle', freq: 150, decay: 0.08, noise: true },
};

// Global state to track current playing beat across components
let globalPlayingBeatId: string | null = null;
let globalStopCallback: (() => void) | null = null;

export const useBeatLoopPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const intervalRef = useRef<number | null>(null);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [soundConfigs, setSoundConfigs] = useState<Record<string, SoundConfig>>(DEFAULT_SOUNDS);
  const soundConfigsRef = useRef<Record<string, SoundConfig>>(DEFAULT_SOUNDS);

  // Keep ref in sync with state
  useEffect(() => {
    soundConfigsRef.current = soundConfigs;
  }, [soundConfigs]);

  const getAudioContext = useCallback(() => {
    // Check if context exists and is still usable
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      return audioContextRef.current;
    }
    // Create new context if none exists or if the old one was closed
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContextRef.current;
  }, []);

  // IMPORTANT: must be called from a direct user gesture BEFORE any awaits/interval playback.
  const ensureAudioContextRunning = useCallback(async () => {
    let ctx = getAudioContext();

    // If context is closed, we need a fresh one
    if (ctx.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx = audioContextRef.current;
    }

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }

    return ctx;
  }, [getAudioContext]);

  const loadAudioBuffer = useCallback(async (url: string, key: string): Promise<AudioBuffer | null> => {
    if (audioBuffersRef.current.has(key)) {
      return audioBuffersRef.current.get(key)!;
    }
    try {
      const ctx = getAudioContext();
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBuffersRef.current.set(key, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load audio for ${key}:`, error);
      return null;
    }
  }, [getAudioContext]);

  // Load default sound configs once
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const { data: sounds } = await supabase
          .from('beat_pad_sounds')
          .select('*')
          .eq('is_active', true)
          .eq('is_default', true);

        if (!sounds?.length) return;

        const newConfigs: Record<string, SoundConfig> = { ...DEFAULT_SOUNDS };
        const loadPromises: Promise<void>[] = [];

        for (const sound of sounds) {
          if (newConfigs[sound.sound_type]) {
            newConfigs[sound.sound_type] = {
              type: (sound.oscillator_type as OscillatorType) || DEFAULT_SOUNDS[sound.sound_type].type,
              freq: sound.frequency || DEFAULT_SOUNDS[sound.sound_type].freq,
              decay: sound.decay || DEFAULT_SOUNDS[sound.sound_type].decay,
              noise: sound.has_noise || DEFAULT_SOUNDS[sound.sound_type].noise,
              audioUrl: sound.audio_url || undefined,
            };
            if (sound.audio_url) {
              loadPromises.push(loadAudioBuffer(sound.audio_url, sound.sound_type).then(() => {}));
            }
          }
        }

        await Promise.all(loadPromises);
        setSoundConfigs(newConfigs);
      } catch (error) {
        console.error('Error loading sound configs:', error);
      }
    };
    loadConfigs();
  }, [loadAudioBuffer]);

  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  // Load sounds by UUID from database
  const loadSoundsByUUID = useCallback(async (uuids: string[]): Promise<void> => {
    // Filter out UUIDs we already have configs for
    const missingUUIDs = uuids.filter(uuid => 
      !soundConfigsRef.current[uuid] && !DEFAULT_SOUNDS[uuid]
    );
    
    if (missingUUIDs.length === 0) return;

    try {
      const { data: sounds } = await supabase
        .from('beat_pad_sounds')
        .select('*')
        .in('id', missingUUIDs);

      if (!sounds?.length) return;

      const newConfigs: Record<string, SoundConfig> = {};
      const loadPromises: Promise<void>[] = [];

      for (const sound of sounds) {
        newConfigs[sound.id] = {
          type: (sound.oscillator_type as OscillatorType) || 'sine',
          freq: sound.frequency || 440,
          decay: sound.decay || 0.2,
          noise: sound.has_noise || false,
          audioUrl: sound.audio_url || undefined,
        };
        
        if (sound.audio_url) {
          loadPromises.push(loadAudioBuffer(sound.audio_url, sound.id).then(() => {}));
        }
      }

      await Promise.all(loadPromises);
      
      setSoundConfigs(prev => ({ ...prev, ...newConfigs }));
      soundConfigsRef.current = { ...soundConfigsRef.current, ...newConfigs };
    } catch (error) {
      console.error('Error loading sounds by UUID:', error);
    }
  }, [loadAudioBuffer]);

  const playSound = useCallback((instrument: string) => {
    const ctx = getAudioContext();
    const config = soundConfigsRef.current[instrument] || DEFAULT_SOUNDS[instrument] || DEFAULT_SOUNDS['kick'];
    if (!config) return;

    const buffer = audioBuffersRef.current.get(instrument);
    if (buffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      return;
    }

    // Synthesized fallback
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = config.type;
    osc.frequency.setValueAtTime(config.freq, now);
    
    if (instrument === 'kick' || instrument.includes('kick')) {
      osc.frequency.exponentialRampToValueAtTime(30, now + config.decay);
    }
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.decay);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + config.decay);

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
  }, [getAudioContext, createNoiseBuffer]);

  const stopBeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlayingBeatId(null);
    setCurrentStep(0);
    globalPlayingBeatId = null;
    globalStopCallback = null;
  }, []);

  const playBeat = useCallback(async (
    beatId: string,
    pattern: Record<string, boolean[]>,
    tempo: number
  ) => {
    // FIRST: Stop any currently playing beat (do this synchronously before any async operations)
    // This ensures we always clear the interval immediately on click
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Check if we're toggling off the same beat (use global state for consistency across components)
    if (globalPlayingBeatId === beatId) {
      setPlayingBeatId(null);
      setCurrentStep(0);
      globalPlayingBeatId = null;
      globalStopCallback = null;
      return;
    }

    // Stop any other playing beat's state
    if (globalStopCallback && globalPlayingBeatId !== beatId) {
      globalStopCallback();
    }

    // Set playing state immediately so UI updates right away
    setPlayingBeatId(beatId);
    globalPlayingBeatId = beatId;
    globalStopCallback = stopBeat;

    // Ensure AudioContext is running (Safari/iOS requires this to happen in a user gesture).
    await ensureAudioContextRunning();

    // Get all instrument keys from the pattern
    const instrumentKeys = Object.keys(pattern);
    
    // Load any missing sound configs by UUID before starting playback
    await loadSoundsByUUID(instrumentKeys);

    // Check if user clicked stop/another beat while we were loading sounds
    if (globalPlayingBeatId !== beatId) {
      return;
    }

    const intervalMs = (60 / tempo / 4) * 1000; // 16th notes
    let step = 0;

    const tick = () => {
      // Safety check: if this beat is no longer playing, don't play sounds
      if (globalPlayingBeatId !== beatId) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      
      setCurrentStep(step);
      Object.entries(pattern).forEach(([instrument, steps]) => {
        if (steps[step]) {
          playSound(instrument);
        }
      });
      
      // Increment plays_count when loop completes (step 15 -> 0)
      if (step === 15) {
        (async () => {
          try {
            await supabase.rpc('increment_beat_plays', { beat_id: beatId });
          } catch (err) {
            console.warn('Failed to increment plays count:', err);
          }
        })();
      }
      
      step = (step + 1) % 16;
    };

    tick(); // Play immediately
    intervalRef.current = window.setInterval(tick, intervalMs);
  }, [playSound, stopBeat, loadSoundsByUUID, ensureAudioContextRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    playBeat,
    stopBeat,
    playingBeatId,
    currentStep,
    isPlaying: (beatId: string) => playingBeatId === beatId,
  };
};

export default useBeatLoopPlayer;
