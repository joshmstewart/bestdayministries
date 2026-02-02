import { supabase } from "@/integrations/supabase/client";

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  onComplete?: (url: string) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Upload a file to Supabase storage with progress tracking
 * Uses XMLHttpRequest to get upload progress events
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  const { onProgress, onComplete, onError, signal, timeoutMs = 300000 } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Get Supabase URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

      const xhr = new XMLHttpRequest();
      
      // Track timeout
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          xhr.abort();
          const error = new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)} seconds`);
          onError?.(error);
          reject(error);
        }, timeoutMs);
      }

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          if (timeoutId) clearTimeout(timeoutId);
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          });
        }
      };

      xhr.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          
          onComplete?.(publicUrl);
          resolve(publicUrl);
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.message || response.error || errorMessage;
          } catch {
            // Use default message
          }
          const error = new Error(errorMessage);
          onError?.(error);
          reject(error);
        }
      };

      xhr.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        const error = new Error('Network error during upload. Please check your connection and try again.');
        onError?.(error);
        reject(error);
      };

      xhr.onabort = () => {
        if (timeoutId) clearTimeout(timeoutId);
        // Don't reject here - already handled by signal listener or timeout
      };

      // Open and send request
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('x-upsert', 'true');
      
      xhr.send(file);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      onError?.(err);
      reject(err);
    }
  });
}

/**
 * Create a unique file path for upload
 */
export function createUploadPath(userId: string, filename: string): string {
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/${Date.now()}_${sanitizedName}`;
}
