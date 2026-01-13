import { useRef, useCallback, useEffect } from 'react';

interface InstrumentConfig {
  type: OscillatorType;
  freq: number;
  decay: number;
  noise?: boolean;
}

// Define instrument sounds using Web Audio API oscillator types and frequencies
const INSTRUMENTS: Record<string, InstrumentConfig> = {
  kick: { type: 'sine', freq: 60, decay: 0.3 },
  snare: { type: 'triangle', freq: 200, decay: 0.1, noise: true },
  hihat: { type: 'square', freq: 800, decay: 0.05 },
  bass: { type: 'sawtooth', freq: 80, decay: 0.2 },
  synth1: { type: 'square', freq: 220, decay: 0.15 },
  synth2: { type: 'sine', freq: 330, decay: 0.2 },
  bell: { type: 'sine', freq: 523, decay: 0.4 },
  clap: { type: 'triangle', freq: 150, decay: 0.08, noise: true },
};

export type InstrumentType = keyof typeof INSTRUMENTS;

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

export const useBeatPadAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const createNoiseBuffer = useCallback((ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  const playSound = useCallback((instrument: InstrumentType) => {
    const ctx = getAudioContext();
    const config = INSTRUMENTS[instrument];
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
  }, [getAudioContext, createNoiseBuffer]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playSound, getAudioContext };
};

export default useBeatPadAudio;
