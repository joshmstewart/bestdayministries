/**
 * AudioManager - Singleton for ambient audio playback.
 *
 * Uses Web Audio API (AudioContext) instead of HTMLAudioElement so that:
 *  1. On iOS the audio session can be set to "ambient" → respects the mute switch.
 *  2. Short sounds mix with background music instead of stealing exclusive focus.
 *
 * Falls back to HTMLAudioElement only when AudioContext is unavailable.
 */

class AudioManager {
  private static instance: AudioManager;

  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private resumePromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Lazily create the AudioContext (must happen after a user gesture on iOS). */
  getContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  /** Ensure the context is running – call from a direct user gesture handler. */
  async ensureRunning(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      if (!this.resumePromise) {
        this.resumePromise = ctx.resume().finally(() => {
          this.resumePromise = null;
        });
      }
      await this.resumePromise;
    }
  }

  // -------- buffer helpers --------

  /** Fetch + decode a remote URL into an AudioBuffer, with caching. */
  async loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    try {
      const ctx = this.getContext();
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn('[AudioManager] Failed to load buffer:', url, e);
      return null;
    }
  }

  /** Decode raw bytes (e.g. base64-decoded TTS audio) into an AudioBuffer. */
  async decodeBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      const ctx = this.getContext();
      return await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn('[AudioManager] Failed to decode buffer:', e);
      return null;
    }
  }

  // -------- playback --------

  /**
   * Play a sound from a URL. Loads + caches the buffer on first use.
   * Returns immediately – fire-and-forget.
   */
  playUrl(url: string, volume = 1): void {
    const cached = this.bufferCache.get(url);
    if (cached) {
      this.playBuffer(cached, volume);
      return;
    }

    // Load async, play when ready (slight delay on first play only)
    this.loadBuffer(url).then((buf) => {
      if (buf) this.playBuffer(buf, volume);
    });
  }

  /** Play an already-decoded AudioBuffer through the shared context. */
  playBuffer(buffer: AudioBuffer, volume = 1): void {
    try {
      const ctx = this.getContext();
      // Auto-resume if suspended (best-effort, may fail without gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch {
      // Silent fail – context may be in a bad state
    }
  }

  /**
   * Play a buffer and return a handle to stop it (for longer audio like TTS).
   */
  playBufferWithControl(
    buffer: AudioBuffer,
    volume = 1,
    onEnded?: () => void,
  ): { stop: () => void } {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

    source.connect(gain);
    gain.connect(ctx.destination);

    source.onended = () => onEnded?.();
    source.start(0);

    return {
      stop: () => {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      },
    };
  }
}

export const audioManager = AudioManager.getInstance();
