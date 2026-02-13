import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;
let ffmpegLoading = false;

export interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'done' | 'error';
  progress: number; // 0-100
  message: string;
  originalSize?: number;
  estimatedSize?: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  quality?: 'low' | 'medium' | 'high';
  onProgress?: (progress: CompressionProgress) => void;
}

const qualitySettings = {
  low: { crf: 28, preset: 'fast' },
  medium: { crf: 23, preset: 'medium' },
  high: { crf: 18, preset: 'slow' },
};

/**
 * Check if FFmpeg WASM is supported in the current browser
 * Uses single-threaded build so SharedArrayBuffer is NOT required
 */
export function isCompressionSupported(): boolean {
  return typeof WebAssembly !== 'undefined';
}

/**
 * Load FFmpeg WASM (cached after first load)
 */
export async function loadFFmpeg(
  onProgress?: (progress: number, message: string) => void
): Promise<FFmpeg> {
  if (ffmpegLoaded && ffmpeg) {
    return ffmpeg;
  }

  if (ffmpegLoading) {
    // Wait for existing load to complete
    while (ffmpegLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpegLoaded && ffmpeg) {
      return ffmpeg;
    }
  }

  ffmpegLoading = true;

  try {
    ffmpeg = new FFmpeg();

    // Log progress during load
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    onProgress?.(10, 'Downloading video processor...');

    // Load single-threaded FFmpeg core (no SharedArrayBuffer needed)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegLoaded = true;
    onProgress?.(100, 'Video processor ready');
    
    return ffmpeg;
  } catch (error) {
    ffmpegLoading = false;
    throw error;
  } finally {
    ffmpegLoading = false;
  }
}

/**
 * Get video duration using a video element
 */
export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress a video file using FFmpeg WASM
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth = 1920, quality = 'medium', onProgress } = options;
  const { crf, preset } = qualitySettings[quality];

  onProgress?.({
    stage: 'loading',
    progress: 0,
    message: 'Preparing video processor...',
    originalSize: file.size,
  });

  // Load FFmpeg
  const ffmpegInstance = await loadFFmpeg((progress, message) => {
    onProgress?.({
      stage: 'loading',
      progress: progress * 0.3, // Loading is 0-30%
      message,
      originalSize: file.size,
    });
  });

  onProgress?.({
    stage: 'compressing',
    progress: 30,
    message: 'Starting compression...',
    originalSize: file.size,
    estimatedSize: Math.round(file.size * 0.3), // Rough estimate
  });

  // Get video duration for progress tracking
  let totalDuration = 0;
  try {
    totalDuration = await getVideoDuration(file);
  } catch (e) {
    console.warn('Could not get video duration:', e);
  }

  // Track compression progress
  ffmpegInstance.on('progress', ({ progress, time }) => {
    // time is in microseconds
    const timeInSeconds = time / 1000000;
    let progressPercent = 30;
    
    if (totalDuration > 0) {
      progressPercent = 30 + (timeInSeconds / totalDuration) * 60; // 30-90%
    } else if (progress) {
      progressPercent = 30 + progress * 60;
    }
    
    onProgress?.({
      stage: 'compressing',
      progress: Math.min(progressPercent, 90),
      message: `Optimizing video... ${Math.round(Math.min(progressPercent, 90))}%`,
      originalSize: file.size,
      estimatedSize: Math.round(file.size * 0.3),
    });
  });

  const inputFileName = 'input' + getFileExtension(file.name);
  const outputFileName = 'output.mp4';

  try {
    // Write input file to FFmpeg virtual filesystem
    await ffmpegInstance.writeFile(inputFileName, await fetchFile(file));

    // Build FFmpeg command
    // Scale down to maxWidth if larger, maintain aspect ratio
    const scaleFilter = `scale='min(${maxWidth},iw)':'-2'`;

    await ffmpegInstance.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', crf.toString(),
      '-vf', scaleFilter,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputFileName,
    ]);

    // Read output file
    const data = await ffmpegInstance.readFile(outputFileName);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputFileName);
    await ffmpegInstance.deleteFile(outputFileName);

    // Create new File object - convert FileData to ArrayBuffer properly
    let arrayBuffer: ArrayBuffer;
    if (typeof data === 'string') {
      // If string, encode it
      const encoder = new TextEncoder();
      arrayBuffer = encoder.encode(data).buffer as ArrayBuffer;
    } else if (data instanceof Uint8Array) {
      // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
      arrayBuffer = new Uint8Array(data).buffer as ArrayBuffer;
    } else {
      // Assume it's already an ArrayBuffer-like
      arrayBuffer = data as ArrayBuffer;
    }
    const compressedBlob = new Blob([new Uint8Array(arrayBuffer)], { type: 'video/mp4' });
    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^.]+$/, '.mp4'),
      { type: 'video/mp4' }
    );

    onProgress?.({
      stage: 'done',
      progress: 100,
      message: 'Compression complete!',
      originalSize: file.size,
      estimatedSize: compressedFile.size,
    });

    return compressedFile;
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Compression failed',
      originalSize: file.size,
    });
    throw error;
  }
}

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext ? `.${ext}` : '.mp4';
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Check if file needs compression
 */
export function shouldCompress(file: File): boolean {
  // Compress if:
  // 1. File is larger than 20MB
  // 2. File is not already MP4 (likely needs transcoding)
  const isLarge = file.size > 20 * 1024 * 1024;
  const isMov = file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov');
  const isWebm = file.type === 'video/webm' || file.name.toLowerCase().endsWith('.webm');
  
  return isLarge || isMov || isWebm;
}
