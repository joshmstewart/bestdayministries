import { useRef, useCallback, useEffect } from 'react';
import { SoundConfig } from '@/components/beat-pad/InstrumentSlot';

export const useCustomBeatAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

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
      console.warn(`Failed to load audio buffer for ${key}:`, error);
      return null;
    }
  }, [getAudioContext]);

  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  // Play audio buffer
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
  const playSynthesizedSound = useCallback((sound: SoundConfig) => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const freq = sound.frequency || 200;
    const decay = sound.decay || 0.2;
    const oscType = (sound.oscillator_type as OscillatorType) || 'sine';

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, now);
    
    // Add pitch envelope for kick-like sounds
    if (freq < 100) {
      osc.frequency.exponentialRampToValueAtTime(30, now + decay);
    }
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + decay);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + decay);

    // Add noise if specified
    if (sound.has_noise) {
      const noiseBuffer = createNoiseBuffer(ctx);
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      noise.buffer = noiseBuffer;
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + decay);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      noise.stop(now + decay);
    }
  }, [getAudioContext, createNoiseBuffer]);

  const playSound = useCallback(async (sound: SoundConfig) => {
    // Try to play from audio URL first
    if (sound.audio_url) {
      let buffer = audioBuffersRef.current.get(sound.id);
      if (!buffer) {
        buffer = await loadAudioBuffer(sound.audio_url, sound.id) || undefined;
      }
      if (buffer) {
        playAudioBuffer(buffer);
        return;
      }
    }
    
    // Fallback to synthesized
    playSynthesizedSound(sound);
  }, [loadAudioBuffer, playAudioBuffer, playSynthesizedSound]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playSound, getAudioContext };
};

export default useCustomBeatAudio;
