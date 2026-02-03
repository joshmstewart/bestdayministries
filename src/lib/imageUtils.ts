import heic2any from 'heic2any';

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  if (heicTypes.includes(file.type.toLowerCase())) return true;
  // Also check extension since type might be empty
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'heic' || ext === 'heif';
}

/**
 * Convert HEIC/HEIF file to JPEG
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  
  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    
    // heic2any can return a single blob or array
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    
    // Create new file with .jpg extension
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resultBlob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please convert it to JPEG or PNG first.');
  }
}

/**
 * Compress and resize image if needed
 * @param file - Original image file
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @returns Compressed file or original if already small enough
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 5,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<File> {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If file is already small enough, return it
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format - preserve PNG for transparency support
        const isPng = file.type === 'image/png';
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        const outputExt = isPng ? '.png' : '.jpg';
        
        // Try different quality levels to get under max size
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              // If still too large and quality can be reduced, try again
              if (blob.size > maxSizeBytes && quality > 0.5) {
                tryCompress(quality - 0.1);
                return;
              }
              
              // Create new file from blob
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, outputExt),
                {
                  type: outputType,
                  lastModified: Date.now(),
                }
              );
              
              resolve(compressedFile);
            },
            outputType,
            quality
          );
        };
        
        // Start with 0.9 quality
        tryCompress(0.9);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Compress audio file if needed
 * @param file - Original audio file
 * @param maxSizeMB - Maximum file size in MB (default: 10)
 * @returns Original file (audio compression requires more complex processing)
 */
export async function compressAudio(
  file: File,
  maxSizeMB: number = 10
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size <= maxSizeBytes) {
    return file;
  }
  
  // Audio compression is more complex and would require a library
  // For now, just warn the user
  console.warn(`Audio file is ${(file.size / 1024 / 1024).toFixed(2)}MB, exceeds ${maxSizeMB}MB limit`);
  throw new Error(`Audio file is too large. Please use a file under ${maxSizeMB}MB.`);
}
